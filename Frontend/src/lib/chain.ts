// Read-only access to the live SolarShare contracts on Base Sepolia (a test
// network). Everything here runs in the browser and needs no key.
import { createPublicClient, fallback, http, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { deployment } from "./contracts.generated";
import hosts from "./hosts.json";

const READ_RPCS = hosts.readRpcs;
const LOG_RPCS = hosts.logRpcs;

export { deployment };

export const EXPLORER = "https://sepolia.basescan.org";
export const REPO_URL = "https://github.com/ORANKIIEY/SolarShare";
export const MONEY_MODEL_URL = `${REPO_URL}/blob/main/docs/money-model/README.md`;

/** Rand per US dollar used for every rand figure (an assumption, see the money model). */
export const ZAR_PER_USD = 16.5;

export const publicClient = createPublicClient({
  chain: baseSepolia,
  batch: { multicall: true },
  transport: fallback(READ_RPCS.map((url) => http(url, { timeout: 10_000 }))),
});

const logClients = LOG_RPCS.map((r) => ({
  maxRange: BigInt(r.maxRange),
  client: createPublicClient({ chain: baseSepolia, transport: http(r.url, { timeout: 15_000 }) }),
}));

const C = deployment.contracts;
export const token = { address: C.SolarShareToken.address as Address, abi: C.SolarShareToken.abi };
export const oracle = { address: C.MeterOracle.address as Address, abi: C.MeterOracle.abi };
export const distributor = { address: C.RevenueDistributor.address as Address, abi: C.RevenueDistributor.abi };
export const sale = { address: C.ShareSale.address as Address, abi: C.ShareSale.abi };
export const usdc = { address: C.USDC.address as Address, abi: C.USDC.abi };

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${EXPLORER}/address/${address}#code`;
export const shortHex = (h: string, n = 4) => `${h.slice(0, 2 + n)}…${h.slice(-n)}`;

// ---------------------------------------------------------------------------
// Meter
// ---------------------------------------------------------------------------

export enum MeterStatus {
  OK = 0,
  THEFT = 1,
  TAMPER = 2,
  OFFLINE = 3,
}

export interface MeterState {
  status: MeterStatus;
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

export async function readMeterState(): Promise<MeterState> {
  const s = await publicClient.readContract({ ...oracle, functionName: "getMeterState" });
  return s as unknown as MeterState;
}

export interface Reading {
  seq: bigint;
  timestamp: bigint;
  energyProducedWh: bigint;
  energySoldWh: bigint;
  powerW: number;
  tamper: boolean;
  gapBps: number;
  txHash: Hex;
  blockNumber: bigint;
}

// ---------------------------------------------------------------------------
// Event history
// ---------------------------------------------------------------------------

type AnyAbi = readonly { type: string; name?: string }[];
type EventAbi = Extract<(typeof C.MeterOracle.abi)[number], { type: "event" }>;

export interface EventLog<A = Record<string, unknown>> {
  args: A;
  txHash: Hex;
  blockNumber: bigint;
}

/**
 * The newest `limit` events of one kind, newest first. `args` filters on
 * indexed fields (for example `{ account: me }`). Walks back from the latest
 * block to the deploy block in the largest steps each endpoint allows.
 */
export async function readEvents<A = Record<string, unknown>>(
  contract: { address: Address; abi: AnyAbi },
  eventName: string,
  opts: { limit?: number; args?: Record<string, unknown>; fromBlock?: bigint } = {},
): Promise<EventLog<A>[]> {
  const limit = opts.limit ?? 10;
  const event = contract.abi.find((x) => x.type === "event" && x.name === eventName) as EventAbi | undefined;
  if (!event) throw new Error(`No event ${eventName}`);
  let lastError: unknown;
  for (const { client, maxRange } of logClients) {
    try {
      const latest = await client.getBlockNumber();
      const start = opts.fromBlock ?? BigInt(deployment.startBlock);
      const found: EventLog<A>[] = [];
      for (let to = latest; to >= start && found.length < limit; to -= maxRange) {
        const from = to - maxRange + 1n > start ? to - maxRange + 1n : start;
        const logs = await client.getLogs({
          address: contract.address,
          event,
          args: opts.args as never,
          fromBlock: from,
          toBlock: to,
        });
        for (const l of [...logs].reverse()) {
          found.push({ args: l.args as A, txHash: l.transactionHash as Hex, blockNumber: l.blockNumber as bigint });
        }
      }
      return found.slice(0, limit);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** The newest `limit` signed meter readings, newest first. */
export async function readRecentReadings(limit = 6): Promise<Reading[]> {
  const logs = await readEvents<Omit<Reading, "txHash" | "blockNumber">>(oracle, "ReadingAccepted", { limit });
  return logs.map((l) => ({ ...l.args, txHash: l.txHash, blockNumber: l.blockNumber }));
}

// ---------------------------------------------------------------------------
// Shares, payouts and documents
// ---------------------------------------------------------------------------

export interface AssetStats {
  sharesSold: bigint;
  maxShares: bigint;
  pricePerShareUsdc: bigint; // 6 decimals
  totalDeposited: bigint; // all income ever paid in (USDC, 6 decimals)
  totalClaimed: bigint; // all payouts ever claimed
  remainingDepositAllowance: bigint; // income the meter has proven but nobody paid in yet
  salePaused: boolean;
}

export async function readAssetStats(): Promise<AssetStats> {
  const [sharesSold, maxShares, pricePerShareUsdc, totalDeposited, totalClaimed, remainingDepositAllowance, salePaused] =
    await Promise.all([
      publicClient.readContract({ ...token, functionName: "totalSupply" }),
      publicClient.readContract({ ...token, functionName: "MAX_SUPPLY" }),
      publicClient.readContract({ ...sale, functionName: "pricePerShare" }),
      publicClient.readContract({ ...distributor, functionName: "totalDeposited" }),
      publicClient.readContract({ ...distributor, functionName: "totalClaimed" }),
      publicClient.readContract({ ...distributor, functionName: "remainingDepositAllowance" }),
      publicClient.readContract({ ...sale, functionName: "paused" }),
    ]);
  return {
    sharesSold: sharesSold as bigint,
    maxShares: maxShares as bigint,
    pricePerShareUsdc: pricePerShareUsdc as bigint,
    totalDeposited: totalDeposited as bigint,
    totalClaimed: totalClaimed as bigint,
    remainingDepositAllowance: remainingDepositAllowance as bigint,
    salePaused: salePaused as boolean,
  };
}

/** Why someone can't claim: RevenueDistributor.claimBlocker. */
export enum ClaimBlocker {
  NONE = 0,
  NOTHING_TO_CLAIM = 1,
  METER_NOT_OK = 2,
  NOT_APPROVED = 3,
  FROZEN = 4,
  PAUSED = 5,
}

export interface Holding {
  shares: bigint;
  usdc: bigint;
  eth: bigint;
  approved: boolean;
  frozen: boolean;
  pendingPayout: bigint;
  claimBlocker: ClaimBlocker;
  totalClaimed: bigint;
  allowance: bigint; // USDC the share sale may take
}

export async function readHolding(who: Address): Promise<Holding> {
  const [shares, usdcBal, eth, approved, frozen, pendingPayout, claimBlocker, totalClaimed, allowance] = await Promise.all([
    publicClient.readContract({ ...token, functionName: "balanceOf", args: [who] }),
    publicClient.readContract({ ...usdc, functionName: "balanceOf", args: [who] }),
    publicClient.getBalance({ address: who }),
    publicClient.readContract({ ...token, functionName: "isApproved", args: [who] }),
    publicClient.readContract({ ...token, functionName: "isFrozen", args: [who] }),
    publicClient.readContract({ ...distributor, functionName: "pendingPayout", args: [who] }),
    publicClient.readContract({ ...distributor, functionName: "claimBlocker", args: [who] }),
    publicClient.readContract({ ...distributor, functionName: "totalClaimedBy", args: [who] }),
    publicClient.readContract({ ...usdc, functionName: "allowance", args: [who, sale.address] }),
  ]);
  return {
    shares: shares as bigint,
    usdc: usdcBal as bigint,
    eth,
    approved: approved as boolean,
    frozen: frozen as boolean,
    pendingPayout: pendingPayout as bigint,
    claimBlocker: Number(claimBlocker) as ClaimBlocker,
    totalClaimed: totalClaimed as bigint,
    allowance: allowance as bigint,
  };
}

// ---------------------------------------------------------------------------
// Errors in plain words
// ---------------------------------------------------------------------------

/** Contract error names we explain to people. Anything else is "network". */
export type ErrorCode =
  | "AccountNotApproved"
  | "AccountFrozen"
  | "SoldOut"
  | "ZeroAmount"
  | "EnforcedPause"
  | "NotEnoughMoney"
  | "MeterNotOk"
  | "NothingToClaim"
  | "SharesPaused"
  | "DepositExceedsAttestedEnergy"
  | "NoSharesIssued"
  | "Unauthorized"
  | "network";

/** Finds the contract's error name inside a viem error, if there is one. */
export function errorCode(e: unknown): ErrorCode {
  const seen = new Set<unknown>();
  let cur: unknown = e;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const o = cur as { data?: { errorName?: string }; shortMessage?: string; cause?: unknown };
    const name = o.data?.errorName;
    if (name) {
      if (name === "ERC20InsufficientBalance" || name === "ERC20InsufficientAllowance") return "NotEnoughMoney";
      if (name === "AccessControlUnauthorizedAccount") return "Unauthorized";
      if (name === "MaxSupplyExceeded") return "SoldOut";
      return name as ErrorCode;
    }
    if (o.shortMessage && /insufficient funds/i.test(o.shortMessage)) return "NotEnoughMoney";
    cur = o.cause;
  }
  return "network";
}

export interface ChainDocument {
  name: string;
  sha256Hash: Hex;
  uri: string;
  updatedAt: bigint;
}

export async function readDocuments(): Promise<ChainDocument[]> {
  const docs = await publicClient.readContract({ ...token, functionName: "getDocuments" });
  return docs as unknown as ChainDocument[];
}

/** SHA-256 of some bytes as 0x-prefixed lowercase hex (browser built-in). */
export async function sha256Hex(bytes: ArrayBuffer): Promise<Hex> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `0x${Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
