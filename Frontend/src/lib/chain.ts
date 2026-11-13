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

const readingEvent = C.MeterOracle.abi.find(
  (x) => x.type === "event" && x.name === "ReadingAccepted",
) as Extract<(typeof C.MeterOracle.abi)[number], { type: "event"; name: "ReadingAccepted" }>;

/** The newest `limit` signed meter readings, newest first. */
export async function readRecentReadings(limit = 6): Promise<Reading[]> {
  let lastError: unknown;
  for (const { client, maxRange } of logClients) {
    try {
      const latest = await client.getBlockNumber();
      const start = BigInt(deployment.startBlock);
      const found: Reading[] = [];
      for (let to = latest; to >= start && found.length < limit; to -= maxRange) {
        const from = to - maxRange + 1n > start ? to - maxRange + 1n : start;
        const logs = await client.getLogs({ address: oracle.address, event: readingEvent, fromBlock: from, toBlock: to });
        for (const l of logs.reverse()) {
          const a = l.args as unknown as Omit<Reading, "txHash" | "blockNumber">;
          found.push({ ...a, txHash: l.transactionHash as Hex, blockNumber: l.blockNumber as bigint });
        }
      }
      return found.slice(0, limit);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Shares and documents
// ---------------------------------------------------------------------------

export interface AssetStats {
  sharesSold: bigint;
  maxShares: bigint;
  pricePerShareUsdc: bigint; // 6 decimals
}

export async function readAssetStats(): Promise<AssetStats> {
  const [sharesSold, maxShares, pricePerShareUsdc] = await Promise.all([
    publicClient.readContract({ ...token, functionName: "totalSupply" }),
    publicClient.readContract({ ...token, functionName: "MAX_SUPPLY" }),
    publicClient.readContract({ ...sale, functionName: "pricePerShare" }),
  ]);
  return {
    sharesSold: sharesSold as bigint,
    maxShares: maxShares as bigint,
    pricePerShareUsdc: pricePerShareUsdc as bigint,
  };
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
