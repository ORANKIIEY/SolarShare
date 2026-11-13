// The heart of the relayer: take one meter message, check it, and get it into
// MeterOracle.submitReading.
//
// Both the live MQTT feed and the software meter (demo backup) go through
// `Relayer.handle`, so they behave identically.
//
// Plain-English summary of what happens to each message:
//   1. Shape check: is it a well-formed meter message?
//   2. Signature check: does it really come from the registered meter device?
//      The meter doesn't send `v`, so we try 27 and 28.
//   3. Dedupe: have we already handled this seq (it arrives on both brokers)?
//   4. Dry run: would the contract accept it? (too old, totals went down, ...)
//   5. Send the transaction, wait for it, retry safely if the network hiccups.
//   6. Read the meter status back from the chain and log it.
import {
  getAddress,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
  type Transport,
  type WalletClient,
} from "viem";
import { meterOracleAbi, statusName, type StatusName } from "./abi";
import { SeqTracker } from "./dedupe";
import {
  describeReading,
  parseMessage,
  recoverV,
  type MeterReading,
  type OracleDomain,
  type ParsedMessage,
} from "./message";
import { revertReason, type RevertReason } from "./reasons";

export interface Logger {
  info(line: string): void;
  warn(line: string): void;
  error(line: string): void;
}

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };

export type Outcome =
  | {
      kind: "accepted";
      reading: MeterReading;
      hash: Hash;
      blockNumber: bigint;
      status: StatusName | string;
      previousStatus: StatusName | string;
      gapBps: number;
    }
  /** Not sent, and that's fine: a copy we already handled. */
  | { kind: "skipped"; reading: MeterReading; reason: "duplicate" | "already-onchain"; text: string }
  /** Not sent because it is invalid or the contract would refuse it. */
  | { kind: "rejected"; reading?: MeterReading; reason: string; text: string }
  /** Valid, but we could not get it onchain after all retries. */
  | { kind: "failed"; reading?: MeterReading; text: string };

export interface MeterState {
  status: number;
  meterId: number;
  deviceSigner: Address;
  lastSeq: bigint;
  lastTimestamp: bigint;
  totalProducedWh: bigint;
  totalSoldWh: bigint;
  lastPowerW: number;
  lastGapBps: number;
  theftActive: boolean;
  tamperActive: boolean;
  offline: boolean;
  theftGapBps: number;
  offlineTimeout: bigint;
}

export interface RelayerOptions {
  publicClient: PublicClient<Transport, Chain | undefined>;
  /** Must have an account (the relayer's wallet, which pays the gas). */
  walletClient: WalletClient<Transport, Chain | undefined, Account>;
  oracle: Address;
  log?: Logger;
  /** How long to wait for a transaction to be mined before trying again. */
  receiptTimeoutMs?: number;
  /** Attempts per reading, including the first. */
  maxAttempts?: number;
  /** Wait between attempts, multiplied by the attempt number. */
  retryDelayMs?: number;
}

/** Block explorer link for a transaction, when there is a public explorer. */
export function explorerTxUrl(chainId: number, hash: Hash): string | undefined {
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${hash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${hash}`;
  return undefined;
}

export function formatGap(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Relayer {
  readonly tracker = new SeqTracker();
  readonly oracle: Address;
  private readonly publicClient: RelayerOptions["publicClient"];
  private readonly walletClient: RelayerOptions["walletClient"];
  private readonly log: Logger;
  private readonly receiptTimeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;

  private queue: Promise<unknown> = Promise.resolve();
  private _domain?: OracleDomain;
  private _state?: MeterState;
  private _chainId?: number;

  constructor(opts: RelayerOptions) {
    this.publicClient = opts.publicClient;
    this.walletClient = opts.walletClient;
    this.oracle = getAddress(opts.oracle);
    this.log = opts.log ?? silentLogger;
    this.receiptTimeoutMs = opts.receiptTimeoutMs ?? 90_000;
    this.maxAttempts = opts.maxAttempts ?? 4;
    this.retryDelayMs = opts.retryDelayMs ?? 3_000;
  }

  get domain(): OracleDomain {
    if (!this._domain) throw new Error("call init() first");
    return this._domain;
  }

  get state(): MeterState {
    if (!this._state) throw new Error("call init() first");
    return this._state;
  }

  get chainId(): number {
    if (this._chainId === undefined) throw new Error("call init() first");
    return this._chainId;
  }

  get relayerAddress(): Address {
    return this.walletClient.account.address;
  }

  /** Reads the oracle's signing domain and current state. Call once before handle(). */
  async init(): Promise<MeterState> {
    const code = await this.publicClient.getCode({ address: this.oracle });
    if (!code || code === "0x") {
      throw new Error(
        `No contract at ${this.oracle} on this network. Is the oracle address right, ` +
          "and is the chain running (and freshly deployed, if it is a local Hardhat node)?",
      );
    }
    this._chainId = await this.publicClient.getChainId();
    const [, name, version, chainId, verifyingContract] = await this.publicClient.readContract({
      address: this.oracle,
      abi: meterOracleAbi,
      functionName: "eip712Domain",
    });
    this._domain = { name, version, chainId: Number(chainId), verifyingContract };
    return this.refreshState();
  }

  async refreshState(): Promise<MeterState> {
    const s = await this.publicClient.readContract({
      address: this.oracle,
      abi: meterOracleAbi,
      functionName: "getMeterState",
    });
    this._state = { ...s };
    this.tracker.setOnChainSeq(s.meterId, s.lastSeq);
    return this._state;
  }

  /**
   * Handle one message from any source. Messages are processed one at a time,
   * in arrival order, so transactions never race each other for a nonce.
   */
  handle(input: string | Uint8Array | object, source = "mqtt"): Promise<Outcome> {
    const run = this.queue.then(() => this.process(input, source));
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Resolves once every queued message has been processed. */
  async idle(): Promise<void> {
    await this.queue;
  }

  private async process(input: string | Uint8Array | object, source: string): Promise<Outcome> {
    let outcome: Outcome;
    try {
      const checked = await this.check(input);
      outcome = "kind" in checked ? checked : await this.submit(checked.message, checked.v);
    } catch (err) {
      // Unexpected trouble (usually the RPC is unreachable). Nothing was sent.
      outcome = { kind: "failed", text: `could not process message: ${shortError(err)}` };
    }
    if (outcome.kind === "failed" && outcome.reading) {
      // It is not onchain, so let a later copy of it (other broker) try again.
      this.tracker.forget(outcome.reading.meterId, outcome.reading.seq);
    }
    this.report(outcome, source);
    return outcome;
  }

  /** Steps 1–4. Returns the message and its `v`, or the reason not to send it. */
  async check(
    input: string | Uint8Array | object,
  ): Promise<Outcome | { message: ParsedMessage; v: 27 | 28 }> {
    // 1. Shape.
    const parsed = parseMessage(input);
    if (!parsed.ok) {
      return { kind: "rejected", reason: "bad-shape", text: `not a valid meter message: ${parsed.errors.join("; ")}` };
    }
    const { message } = parsed;
    const { reading } = message;

    if (reading.meterId !== this.state.meterId) {
      return {
        kind: "rejected",
        reading,
        reason: "WrongMeter",
        text: `reading is for meter ${reading.meterId}, but this oracle is for meter ${this.state.meterId}`,
      };
    }

    // 2. Signature. If it doesn't match, the device may have just been changed
    //    (setDevice), so re-read the oracle once before giving up.
    let rec = await recoverV(message, this.domain, this.state.deviceSigner);
    if (!rec.valid) {
      const before = this.state.deviceSigner;
      await this.refreshState();
      if (this.state.deviceSigner !== before) rec = await recoverV(message, this.domain, this.state.deviceSigner);
    }
    if (!rec.valid) {
      return {
        kind: "rejected",
        reading,
        reason: "InvalidSigner",
        text:
          `signature does not match the registered meter ${this.state.deviceSigner} ` +
          `(it recovers to ${rec.recovered.join(" or ") || "nothing"}). Either the message was ` +
          `changed after signing, or the meter signed for a different contract or chain ` +
          `(it must use verifyingContract ${this.domain.verifyingContract} and chainId ${this.domain.chainId})`,
      };
    }

    // 3. Dedupe (only now that we know the meter really sent it).
    const seen = this.tracker.check(reading.meterId, reading.seq);
    if (!seen.fresh) {
      return {
        kind: "skipped",
        reading,
        reason: seen.reason,
        text:
          seen.reason === "duplicate"
            ? `seq ${reading.seq} already handled (second copy, e.g. from the other broker)`
            : `seq ${reading.seq} is already onchain (last accepted seq ${this.tracker.onChainSeq(reading.meterId)})`,
      };
    }
    this.tracker.markHandled(reading.meterId, reading.seq);

    // 4. Dry run against the real contract. This catches every rule the
    //    contract enforces (too old, from the future, totals went down, ...).
    let why: RevertReason | undefined;
    try {
      why = await this.wouldRevert(message, rec.v);
    } catch (err) {
      this.log.warn(`  seq ${reading.seq}: dry run failed (${shortError(err)}); sending anyway`);
    }
    if (why) {
      if (why.name === "SeqNotIncreasing") {
        return { kind: "skipped", reading, reason: "already-onchain", text: why.text };
      }
      return { kind: "rejected", reading, reason: why.name, text: why.text };
    }
    return { message, v: rec.v };
  }

  private submitArgs(message: ParsedMessage, v: number) {
    return [message.reading, v, message.r, message.s] as const;
  }

  private async wouldRevert(message: ParsedMessage, v: number): Promise<RevertReason | undefined> {
    try {
      await this.publicClient.simulateContract({
        address: this.oracle,
        abi: meterOracleAbi,
        functionName: "submitReading",
        args: this.submitArgs(message, v),
        account: this.walletClient.account,
      });
      return undefined;
    } catch (err) {
      const why = revertReason(err);
      if (why) return why;
      throw err; // network trouble, not a contract rule: let the caller retry
    }
  }

  /** Step 5 and 6: send it, with safe retries. */
  private async submit(message: ParsedMessage, v: 27 | 28): Promise<Outcome> {
    const { reading } = message;
    const previousStatus = statusName(this.state.status);
    const sent: Hash[] = [];
    let nonce: number | undefined;
    let lastError = "";

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        // Did an earlier attempt make it after all? Then we're done: never
        // send a second transaction for the same seq.
        const landed = await this.findLanded(sent);
        if (landed) return this.accepted(reading, landed, previousStatus);
        if (attempt > 1) {
          // Something went wrong last time: re-check before sending again.
          const state = await this.refreshState();
          if (state.lastSeq >= reading.seq) {
            return {
              kind: "skipped",
              reading,
              reason: "already-onchain",
              text: `seq ${reading.seq} is already onchain (an earlier attempt landed, or another relayer sent it)`,
            };
          }
          const why = await this.wouldRevert(message, v);
          if (why) return { kind: "rejected", reading, reason: why.name, text: why.text };
        }

        // Reuse the same nonce on a retry, so the retry REPLACES the stuck
        // transaction instead of queueing a second copy behind it.
        if (nonce === undefined) {
          nonce = await this.publicClient.getTransactionCount({
            address: this.relayerAddress,
            blockTag: "pending",
          });
        }
        const fees = attempt > 1 ? await this.bumpedFees(attempt) : {};
        const hash = await this.walletClient.writeContract({
          address: this.oracle,
          abi: meterOracleAbi,
          functionName: "submitReading",
          args: this.submitArgs(message, v),
          account: this.walletClient.account,
          chain: this.walletClient.chain,
          nonce,
          ...fees,
        });
        sent.push(hash);

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          timeout: this.receiptTimeoutMs,
        });
        if (receipt.status === "success") return this.accepted(reading, receipt, previousStatus);

        // Mined but reverted (state changed between dry run and mining).
        const why = await this.wouldRevert(message, v).catch(() => undefined);
        return {
          kind: "rejected",
          reading,
          reason: why?.name ?? "Reverted",
          text: `transaction ${hash} reverted: ${why?.text ?? "the contract rejected it"}`,
        };
      } catch (err) {
        const why = revertReason(err);
        if (why) {
          if (why.name === "SeqNotIncreasing") {
            return { kind: "skipped", reading, reason: "already-onchain", text: why.text };
          }
          return { kind: "rejected", reading, reason: why.name, text: why.text };
        }
        lastError = shortError(err);
        if (/nonce too low|nonce has already been used|nonce.*lower than|already known/i.test(lastError)) {
          // Our nonce was used. If by our own earlier attempt, findLanded()
          // sees it next time round; otherwise fetch a fresh nonce.
          if (!(await this.findLanded(sent))) nonce = undefined;
        }
        if (attempt < this.maxAttempts) {
          this.log.warn(`  seq ${reading.seq}: attempt ${attempt} failed (${lastError}); retrying`);
          await sleep(this.retryDelayMs * attempt);
        }
      }
    }
    const landed = await this.findLanded(sent).catch(() => undefined);
    if (landed) return this.accepted(reading, landed, previousStatus);
    return {
      kind: "failed",
      reading,
      text: `could not get seq ${reading.seq} onchain after ${this.maxAttempts} attempts: ${lastError}`,
    };
  }

  private async findLanded(hashes: Hash[]): Promise<TransactionReceipt | undefined> {
    for (const hash of hashes) {
      const receipt = await this.publicClient.getTransactionReceipt({ hash }).catch(() => undefined);
      if (receipt?.status === "success") return receipt;
    }
    return undefined;
  }

  /** 25% more per attempt, so a replacement transaction is accepted by the node. */
  private async bumpedFees(attempt: number) {
    try {
      const fees = await this.publicClient.estimateFeesPerGas();
      const bump = (x: bigint) => (x * BigInt(100 + 25 * attempt)) / 100n;
      if (fees.maxFeePerGas !== undefined && fees.maxPriorityFeePerGas !== undefined) {
        return { maxFeePerGas: bump(fees.maxFeePerGas), maxPriorityFeePerGas: bump(fees.maxPriorityFeePerGas) };
      }
    } catch {
      // fall back to the node's defaults
    }
    return {};
  }

  private async accepted(
    reading: MeterReading,
    receipt: TransactionReceipt,
    previousStatus: string,
  ): Promise<Outcome> {
    const state = await this.refreshState();
    return {
      kind: "accepted",
      reading,
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: statusName(state.status),
      previousStatus,
      gapBps: state.lastGapBps,
    };
  }

  /** One console line per reading (two when the status changes). */
  private report(outcome: Outcome, source: string): void {
    const from = `[${source}]`;
    switch (outcome.kind) {
      case "accepted": {
        const link = explorerTxUrl(this.chainId, outcome.hash);
        this.log.info(
          `${from} ACCEPTED ${describeReading(outcome.reading)}  gap ${formatGap(outcome.gapBps)}  ` +
            `-> block ${outcome.blockNumber}, status ${outcome.status}` +
            (link ? `  ${link}` : `  tx ${outcome.hash}`),
        );
        if (outcome.status !== outcome.previousStatus) {
          this.log.warn(`  STATUS ${outcome.previousStatus} -> ${outcome.status}${statusHint(outcome.status)}`);
        }
        break;
      }
      case "skipped":
        this.log.info(`${from} skipped  seq ${outcome.reading.seq}: ${outcome.text}`);
        break;
      case "rejected":
        this.log.warn(
          `${from} REJECTED ${outcome.reading ? `seq ${outcome.reading.seq}` : "message"}: ${outcome.text}`,
        );
        break;
      case "failed":
        this.log.error(`${from} FAILED   ${outcome.text}`);
        break;
    }
  }
}

export function statusHint(status: string): string {
  switch (status) {
    case "OK":
      return " (payouts can be claimed)";
    case "THEFT":
      return " (sold energy is more than 15% behind produced: payouts paused until it recovers)";
    case "TAMPER":
      return " (meter case opened: payouts paused until an admin calls clearTamper)";
    case "OFFLINE":
      return " (no recent reading: payouts paused until the meter reports again)";
    default:
      return "";
  }
}

function shortError(err: unknown): string {
  if (err && typeof err === "object" && "shortMessage" in err && typeof err.shortMessage === "string") {
    return err.shortMessage;
  }
  return err instanceof Error ? err.message.split("\n")[0] : String(err);
}
