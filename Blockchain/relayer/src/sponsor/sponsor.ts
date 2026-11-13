// The sponsor: gives a newly approved investor wallet a little test ETH (for
// gas) and, optionally, some test USDC, so they can buy shares without ever
// seeing a gas prompt or a faucet.
//
// DEMO SHORTCUT, testnet only. In production this would be a smart wallet
// (ERC-4337) with a paymaster that pays the gas inside the user's own
// transaction, so no ETH ever has to be sent around.
import { formatEther, formatUnits, getAddress, isAddress, type Address, type Hash } from "viem";
import type { Logger } from "../relayer";
import type { SponsorLedger, SponsorLimits } from "./limits";

/** Everything the sponsor needs from the chain (real: chain.ts; tests: a fake). */
export interface SponsorChain {
  sponsorAddress: Address;
  isApproved(wallet: Address): Promise<boolean>;
  isFrozen(wallet: Address): Promise<boolean>;
  ethBalance(wallet: Address): Promise<bigint>;
  usdcBalance(wallet: Address): Promise<bigint>;
  /** Send and wait until it's in a block. */
  sendEth(to: Address, wei: bigint): Promise<Hash>;
  sendUsdc(to: Address, amount: bigint): Promise<Hash>;
}

export interface SponsorOptions {
  chain: SponsorChain;
  ledger: SponsorLedger;
  limits: SponsorLimits;
  /** Target ETH balance (wei) for an investor wallet: we top up to this. */
  ethAmountWei: bigint;
  /** Target test-USDC balance (6 decimals). 0 = send no USDC. */
  usdcAmount: bigint;
  /** Builds a block-explorer link for a transaction, if there is one. */
  txLink?: (hash: Hash) => string;
  log?: Logger;
  /** Unix seconds; injectable for tests. */
  now?: () => number;
}

export type SponsorErrorCode =
  | "BAD_REQUEST"
  | "NOT_APPROVED"
  | "FROZEN"
  | "WALLET_LIMIT"
  | "BUSY"
  | "BUDGET_SPENT"
  | "SPONSOR_EMPTY"
  | "SEND_FAILED";

export interface Transfer {
  amount: string; // human units ("0.0005", "25")
  txHash?: Hash;
  explorer?: string;
  skipped?: string;
}

export type SponsorResponse =
  | { ok: true; address: Address; alreadyFunded: boolean; eth: Transfer; usdc: Transfer }
  | { ok: false; error: SponsorErrorCode; message: string; retryAfterS?: number };

export interface SponsorResult {
  status: number;
  body: SponsorResponse;
}

const quiet: Logger = { info() {}, warn() {}, error() {} };

export class Sponsor {
  private readonly o: Required<Omit<SponsorOptions, "txLink">> & Pick<SponsorOptions, "txLink">;
  /** One top-up at a time: no nonce clashes, and limits can't be raced. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: SponsorOptions) {
    this.o = { log: quiet, now: () => Math.floor(Date.now() / 1000), ...options };
  }

  get address(): Address {
    return this.o.chain.sponsorAddress;
  }

  /** Handles one POST /sponsor body. Never throws. */
  async handle(body: unknown): Promise<SponsorResult> {
    const raw = typeof body === "object" && body !== null ? (body as { address?: unknown }).address : undefined;
    if (typeof raw !== "string" || !isAddress(raw, { strict: false })) {
      return fail(400, "BAD_REQUEST", 'Send JSON like {"address": "0x…"} with a valid wallet address.');
    }
    const wallet = getAddress(raw);
    const short = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
    const { chain, log } = this.o;

    try {
      // The approval check: only wallets the KYC officer approved on
      // SolarShareToken get anything. This is what stops random wallets from
      // draining the sponsor.
      const [approved, frozen] = await Promise.all([chain.isApproved(wallet), chain.isFrozen(wallet)]);
      if (!approved) {
        log.warn(`sponsor: refused ${short}: not approved on SolarShareToken`);
        return fail(403, "NOT_APPROVED", "This wallet is not approved yet. The operator must approve it before it can be topped up.");
      }
      if (frozen) {
        log.warn(`sponsor: refused ${short}: wallet is frozen`);
        return fail(403, "FROZEN", "This wallet is frozen.");
      }
    } catch (err) {
      log.error(`sponsor: couldn't read approval for ${short}: ${firstLine(err)}`);
      return fail(502, "SEND_FAILED", "Couldn't reach the chain to check the wallet. Try again.");
    }

    return this.serial(() => this.topUp(wallet, short));
  }

  private async topUp(wallet: Address, short: string): Promise<SponsorResult> {
    const { chain, ledger, limits, log, ethAmountWei, usdcAmount } = this.o;
    const now = this.o.now();

    let ethHave: bigint, usdcHave: bigint, sponsorEth: bigint, sponsorUsdc: bigint;
    try {
      [ethHave, usdcHave, sponsorEth, sponsorUsdc] = await Promise.all([
        chain.ethBalance(wallet),
        usdcAmount > 0n ? chain.usdcBalance(wallet) : Promise.resolve(0n),
        chain.ethBalance(chain.sponsorAddress),
        usdcAmount > 0n ? chain.usdcBalance(chain.sponsorAddress) : Promise.resolve(0n),
      ]);
    } catch (err) {
      log.error(`sponsor: couldn't read balances for ${short}: ${firstLine(err)}`);
      return fail(502, "SEND_FAILED", "Couldn't reach the chain to read balances. Try again.");
    }

    // Top up to the target, never more.
    const ethNeed = ethHave < ethAmountWei ? ethAmountWei - ethHave : 0n;
    let usdcNeed = usdcHave < usdcAmount ? usdcAmount - usdcHave : 0n;
    if (ethNeed === 0n && usdcNeed === 0n) {
      log.info(`sponsor: ${short} already has enough ETH${usdcAmount > 0n ? " and USDC" : ""}, nothing sent`);
      return {
        status: 200,
        body: {
          ok: true,
          address: wallet,
          alreadyFunded: true,
          eth: { amount: "0", skipped: "already has enough" },
          usdc: { amount: "0", skipped: usdcAmount > 0n ? "already has enough" : "USDC top-ups are off" },
        },
      };
    }

    const verdict = ledger.check(wallet, ethNeed, limits, now);
    if (!verdict.ok) {
      log.warn(`sponsor: refused ${short}: ${verdict.code}: ${verdict.message}`);
      const status = verdict.code === "BUDGET_SPENT" ? 503 : 429;
      return fail(status, verdict.code, verdict.message, "retryAfterS" in verdict ? verdict.retryAfterS : undefined);
    }

    if (ethNeed > 0n && sponsorEth < ethNeed * 2n) {
      log.error(`sponsor: OUT OF ETH (${formatEther(sponsorEth)} ETH left in ${chain.sponsorAddress}): refill it`);
      return fail(503, "SPONSOR_EMPTY", "The sponsor wallet has run out of test ETH. Ask the operator to refill it.");
    }

    // USDC is a bonus: trimmed to the cap and the sponsor's balance, never a reason to refuse.
    let usdcSkip: string | undefined = usdcAmount === 0n ? "USDC top-ups are off" : usdcNeed === 0n ? "already has enough" : undefined;
    const room = ledger.usdcRoom(limits);
    if (!usdcSkip && room < usdcNeed) {
      usdcNeed = room;
      if (room === 0n) usdcSkip = "the sponsor's total USDC budget is used up";
    }
    if (!usdcSkip && sponsorUsdc < usdcNeed) {
      usdcSkip = "the sponsor wallet is out of test USDC";
      log.warn(`sponsor: out of USDC (${formatUnits(sponsorUsdc, 6)} left): sending ETH only`);
    }
    if (usdcSkip) usdcNeed = 0n;

    const eth: Transfer = { amount: formatEther(ethNeed) };
    const usdc: Transfer = { amount: formatUnits(usdcNeed, 6) };
    if (ethNeed === 0n) eth.skipped = "already has enough";
    if (usdcSkip) usdc.skipped = usdcSkip;

    if (ethNeed > 0n) {
      try {
        eth.txHash = await chain.sendEth(wallet, ethNeed);
        eth.explorer = this.o.txLink?.(eth.txHash);
      } catch (err) {
        log.error(`sponsor: sending ETH to ${short} FAILED: ${firstLine(err)}`);
        return fail(502, "SEND_FAILED", "Sending test ETH failed. Nothing was recorded; try again.");
      }
    }
    if (usdcNeed > 0n) {
      try {
        usdc.txHash = await chain.sendUsdc(wallet, usdcNeed);
        usdc.explorer = this.o.txLink?.(usdc.txHash);
      } catch (err) {
        log.error(`sponsor: sending USDC to ${short} FAILED: ${firstLine(err)}`);
        usdc.skipped = "sending USDC failed";
        usdc.amount = "0";
        usdcNeed = 0n;
      }
    }

    ledger.record(wallet, ethNeed, usdcNeed, now, limits);
    log.info(
      `sponsor: topped up ${short}: ${eth.amount} ETH${usdcNeed > 0n ? ` + ${usdc.amount} USDC` : ""}` +
        `  (total given: ${formatEther(ledger.totalEthWei)} ETH, ${formatUnits(ledger.totalUsdc, 6)} USDC)`,
    );
    return { status: 200, body: { ok: true, address: wallet, alreadyFunded: false, eth, usdc } };
  }

  /** Numbers for GET /health. */
  async status() {
    const { chain, ledger, limits, ethAmountWei, usdcAmount } = this.o;
    const [eth, usdc] = await Promise.all([
      chain.ethBalance(chain.sponsorAddress),
      usdcAmount > 0n ? chain.usdcBalance(chain.sponsorAddress) : Promise.resolve(0n),
    ]);
    return {
      sponsor: chain.sponsorAddress,
      balance: { eth: formatEther(eth), usdc: formatUnits(usdc, 6) },
      topUpTo: { eth: formatEther(ethAmountWei), usdc: formatUnits(usdcAmount, 6) },
      limits: {
        perWallet: `${limits.perWalletMax} per ${limits.perWalletWindowS} s`,
        perHourAllWallets: limits.globalMaxPerHour,
        totalEthCap: formatEther(limits.totalEthCapWei),
        totalUsdcCap: formatUnits(limits.totalUsdcCap, 6),
      },
      given: { eth: formatEther(ledger.totalEthWei), usdc: formatUnits(ledger.totalUsdc, 6) },
    };
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

function fail(status: number, error: SponsorErrorCode, message: string, retryAfterS?: number): SponsorResult {
  return { status, body: { ok: false, error, message, ...(retryAfterS !== undefined ? { retryAfterS } : {}) } };
}

function firstLine(err: unknown): string {
  return String((err as Error)?.message ?? err).split("\n")[0];
}
