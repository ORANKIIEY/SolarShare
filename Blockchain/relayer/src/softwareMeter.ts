// DEMO BACKUP: a "software meter" for when Wokwi (or the MQTT broker) is down.
//
// It plays the ESP32: it signs readings in Node with the device's test key,
// with fresh timestamps and seq numbers, and the deployed oracle address as
// `verifyingContract`. Each message then goes through exactly the same
// Relayer.handle() path as a real MQTT message (shape check, v recovery,
// dedupe, dry run, submit).
//
// It is NOT a real meter: anyone holding the device key can sign anything.
// That's why the key must be a test key and this mode is labelled loudly.
import type { Account, Address, Chain, PublicClient, Transport, WalletClient } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { DEFAULT_ADMIN_ROLE, meterOracleAbi, statusName } from "./abi";
import { parseMessage, signLikeMeter, type MeterReading } from "./message";
import { readRecording } from "./recorder";
import { formatGap, type Logger, type Outcome, type Relayer } from "./relayer";

/** One reading's worth of energy, like one 30-second step of the real meter. */
export interface ReadingStep {
  kind: "reading";
  phase: string;
  powerW: number;
  deltaProducedWh: bigint;
  deltaSoldWh: bigint;
  tamper: boolean;
}

export type DemoStep =
  | ReadingStep
  /** Print a heading for the next phase. */
  | { kind: "phase"; title: string; detail: string }
  /** An admin inspects the meter and clears TAMPER (needs the admin role). */
  | { kind: "clear-tamper" }
  /** Send nothing until the oracle reports OFFLINE. */
  | { kind: "silence" };

/** The real meter sends one reading every 30 s. */
const STEP_SECONDS = 30;
export const NORMAL_SOLD_RATIO = 0.93; // 7% normal line loss
export const THEFT_SOLD_RATIO = 0.65; // an illegal connection takes 35%

/** Energy for one 30 s step at `powerW`, and how much of it was paid for. */
export function step(phase: string, powerW: number, soldRatio: number, tamper = false): ReadingStep {
  const deltaProducedWh = BigInt(Math.round((powerW * STEP_SECONDS) / 3600));
  const deltaSoldWh = BigInt(Math.round(Number(deltaProducedWh) * soldRatio));
  return { kind: "reading", phase, powerW, deltaProducedWh, deltaSoldWh, tamper };
}

/** Sunny-day power with a little wobble, so the numbers look alive. */
function sunny(i: number): number {
  return 5000 + Math.round(Math.sin(i * 1.7) * 180);
}

export interface ScenarioOptions {
  tamper?: boolean;
  offline?: boolean;
}

/**
 * The scripted demo: normal → theft → recovery, then optionally tamper and
 * silence-until-OFFLINE.
 */
export function demoScenario(opts: ScenarioOptions = {}): DemoStep[] {
  let i = 0;
  const normal = (phase: string, n: number) =>
    Array.from({ length: n }, () => step(phase, sunny(i++), NORMAL_SOLD_RATIO));
  const steps: DemoStep[] = [
    { kind: "phase", title: "Normal", detail: "sold is about 93% of produced (normal line loss): status OK" },
    ...normal("normal", 4),
    {
      kind: "phase",
      title: "Theft",
      detail: "an illegal connection takes power: sold falls to 65% of produced, more than 15% behind",
    },
    ...Array.from({ length: 3 }, () => step("theft", sunny(i++), THEFT_SOLD_RATIO)),
    { kind: "phase", title: "Recovery", detail: "the illegal connection is removed: THEFT clears by itself" },
    ...normal("recovery", 3),
  ];
  if (opts.tamper) {
    steps.push(
      { kind: "phase", title: "Tamper", detail: "someone opens the meter case: TAMPER, and it stays until an admin clears it" },
      step("tamper", sunny(i++), NORMAL_SOLD_RATIO, true),
      ...normal("tamper", 1),
      { kind: "clear-tamper" },
      ...normal("after-tamper", 1),
    );
  }
  if (opts.offline) {
    steps.push(
      { kind: "phase", title: "Offline", detail: "the meter goes silent: OFFLINE once the timeout passes" },
      { kind: "silence" },
      { kind: "phase", title: "Back online", detail: "the meter reports again: OK" },
      ...normal("back-online", 2),
    );
  }
  return steps;
}

/**
 * Turns a recording (relayer/recordings/*.jsonl) back into steps. Only the
 * CHANGES between readings are kept; the software meter re-signs them on top of
 * the oracle's current totals, with fresh timestamps and seq numbers.
 */
export function stepsFromRecording(file: string): DemoStep[] {
  const bySeq = new Map<bigint, MeterReading>();
  for (const entry of readRecording(file)) {
    const parsed = parseMessage(entry.payload);
    if (parsed.ok) bySeq.set(parsed.message.reading.seq, parsed.message.reading);
  }
  const readings = [...bySeq.values()].sort((a, b) => (a.seq < b.seq ? -1 : a.seq > b.seq ? 1 : 0));
  const steps: DemoStep[] = [
    { kind: "phase", title: "Replay", detail: `${readings.length} recorded readings from ${file}, re-signed` },
  ];
  for (let k = 1; k < readings.length; k++) {
    const prev = readings[k - 1];
    const cur = readings[k];
    // A meter restart without saved totals makes totals drop: skip that gap.
    if (cur.energyProducedWh < prev.energyProducedWh || cur.energySoldWh < prev.energySoldWh) continue;
    steps.push({
      kind: "reading",
      phase: "replay",
      powerW: cur.powerW,
      deltaProducedWh: cur.energyProducedWh - prev.energyProducedWh,
      deltaSoldWh: cur.energySoldWh - prev.energySoldWh,
      tamper: cur.tamper,
    });
  }
  return steps;
}

export interface SoftwareMeterOptions {
  relayer: Relayer;
  device: PrivateKeyAccount;
  publicClient: PublicClient<Transport, Chain | undefined>;
  walletClient: WalletClient<Transport, Chain | undefined, Account>;
  log: Logger;
  intervalMs: number;
  /** Called with every message before it is relayed (the recorder). */
  onMessage?: (payload: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SoftwareMeter {
  private seq = 0n;
  private stopped = false;

  constructor(private readonly o: SoftwareMeterOptions) {}

  get address(): Address {
    return this.o.device.address;
  }

  stop(): void {
    this.stopped = true;
  }

  /**
   * Makes sure the oracle expects this device. With `register`, an admin
   * relayer key can switch the oracle over to it (setDevice keeps the totals).
   */
  async ensureRegistered(register: boolean): Promise<void> {
    const state = await this.o.relayer.refreshState();
    if (state.deviceSigner === this.address) return;
    if (!register) {
      throw new Error(
        `MeterOracle expects device ${state.deviceSigner}, but DEMO_DEVICE_PRIVATE_KEY is ${this.address}. ` +
          "Use the same key as the Wokwi meter (its secrets.h), or add --register-device to switch the " +
          "oracle to this key (needs the admin wallet as RELAYER_PRIVATE_KEY).",
      );
    }
    await this.adminWrite("setDevice", [state.meterId, this.address]);
    await this.o.relayer.refreshState();
    this.o.log.warn(`Registered software meter ${this.address} as meter ${state.meterId}'s device (was ${state.deviceSigner})`);
  }

  async run(steps: DemoStep[]): Promise<Outcome[]> {
    const outcomes: Outcome[] = [];
    let first = true;
    for (const s of steps) {
      if (this.stopped) break;
      if (s.kind === "phase") {
        this.o.log.info(`\n=== ${s.title}: ${s.detail} ===`);
        continue;
      }
      if (s.kind === "clear-tamper") {
        await this.clearTamper();
        continue;
      }
      if (s.kind === "silence") {
        await this.waitForOffline();
        continue;
      }
      if (!first) await sleep(this.o.intervalMs);
      first = false;
      outcomes.push(await this.send(s));
    }
    return outcomes;
  }

  /** Keep sending normal readings until stop(), so the status doesn't go OFFLINE. */
  async keepAlive(): Promise<void> {
    this.o.log.info(`\n=== Software meter keeps sending normal readings (Ctrl+C to stop) ===`);
    let i = 100;
    while (!this.stopped) {
      await sleep(this.o.intervalMs);
      if (this.stopped) break;
      await this.send(step("normal", sunny(i++), NORMAL_SOLD_RATIO));
    }
  }

  /** Build, sign and relay one reading on top of the oracle's current totals. */
  async send(s: ReadingStep): Promise<Outcome> {
    const state = this.o.relayer.state;
    const nowS = BigInt(Math.floor(Date.now() / 1000));
    const block = await this.o.publicClient.getBlock({ blockTag: "latest" });
    // Fresh timestamp. Use the chain's clock if it is ahead (a local node after a
    // time jump), so the reading doesn't look old to the oracle.
    let timestamp = nowS > block.timestamp ? nowS : block.timestamp;
    if (timestamp < state.lastTimestamp) timestamp = state.lastTimestamp;
    // Like the ESP32: seq is at least the current Unix time, and always goes up.
    let seq = state.lastSeq + 1n;
    if (this.seq + 1n > seq) seq = this.seq + 1n;
    if (nowS > seq) seq = nowS;
    this.seq = seq;

    const reading: MeterReading = {
      meterId: state.meterId,
      seq,
      timestamp,
      energyProducedWh: state.totalProducedWh + s.deltaProducedWh,
      energySoldWh: state.totalSoldWh + s.deltaSoldWh,
      powerW: s.powerW,
      tamper: s.tamper,
    };
    const wire = await signLikeMeter(reading, this.o.relayer.domain, this.o.device);
    const payload = JSON.stringify(wire);
    this.o.onMessage?.(payload);
    return this.o.relayer.handle(payload, "software-meter");
  }

  private async clearTamper(): Promise<void> {
    const isAdmin = await this.o.publicClient.readContract({
      address: this.o.relayer.oracle,
      abi: meterOracleAbi,
      functionName: "hasRole",
      args: [DEFAULT_ADMIN_ROLE, this.o.walletClient.account.address],
    });
    if (!isAdmin) {
      this.o.log.warn(
        "Admin inspection: the relayer wallet is not an admin, so it can't clear TAMPER. " +
          "Clear it from the admin wallet (MeterOracle.clearTamper) - waiting 30 s.",
      );
      await sleep(30_000);
      return;
    }
    await this.adminWrite("clearTamper", []);
    const state = await this.o.relayer.refreshState();
    this.o.log.warn(`Admin inspected the meter and called clearTamper: status ${statusName(state.status)}`);
  }

  private async waitForOffline(): Promise<void> {
    const { relayer, publicClient, log } = this.o;
    let state = await relayer.refreshState();
    const timeout = Number(state.offlineTimeout);
    if (relayer.chainId === 31337) {
      // Local Hardhat node: jump the chain clock instead of waiting.
      log.info(`Meter silent. Local chain: fast-forwarding the clock ${timeout + 1} s (offlineTimeout ${timeout} s).`);
      await publicClient.request({ method: "evm_increaseTime" as any, params: [timeout + 1] as any });
      await publicClient.request({ method: "evm_mine" as any, params: [] as any });
    } else {
      log.info(
        `Meter silent. Waiting for OFFLINE: up to ${timeout} s after the last reading ` +
          "(an operator can shorten this with setOfflineTimeout).",
      );
      const deadline = Date.now() + (timeout + 180) * 1000;
      while (!this.stopped && Date.now() < deadline) {
        state = await relayer.refreshState();
        if (state.offline) break;
        await sleep(10_000);
      }
    }
    state = await relayer.refreshState();
    log.warn(`  STATUS now ${statusName(state.status)} (last reading ${formatGap(state.lastGapBps)} gap)`);
  }

  private async adminWrite(functionName: "setDevice" | "clearTamper", args: readonly unknown[]): Promise<void> {
    const { walletClient, publicClient, relayer } = this.o;
    const hash = await walletClient.writeContract({
      address: relayer.oracle,
      abi: meterOracleAbi,
      functionName,
      args: args as any,
      account: walletClient.account,
      chain: walletClient.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${functionName} transaction ${hash} reverted`);
  }
}
