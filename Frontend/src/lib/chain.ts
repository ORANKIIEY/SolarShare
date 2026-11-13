import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  type PublicClient,
  type Chain,
} from "viem";
import {
  type Address,
  type Hex,
  MeterStatus,
  ClaimBlocker,
  type MeterState,
  type MeterReading,
  type AssetPageData,
  type MySharesData,
  BASE_SEPOLIA_CHAIN_ID,
  USDC_DECIMALS,
  SHARE_DECIMALS,
  MAX_SUPPLY,
} from "./chain-types";

// Import ABIs
import SolarShareTokenAbi from "@/abi/SolarShareToken.json";
import MeterOracleAbi from "@/abi/MeterOracle.json";
import RevenueDistributorAbi from "@/abi/RevenueDistributor.json";
import ShareSaleAbi from "@/abi/ShareSale.json";
import MockUSDCAbi from "@/abi/MockUSDC.json";
import sampleData from "./sample-data.json";

// ── Base Sepolia Chain Definition ──────────────────────────────────────────
export const baseSepolia: Chain = {
  id: BASE_SEPOLIA_CHAIN_ID,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
};

// ── Viem Public Client ─────────────────────────────────────────────────────
const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org";

export const publicClient: PublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl, {
    timeout: 10_000,
    retryCount: 2,
  }),
});

// ── Contract Addresses ─────────────────────────────────────────────────────
// Real deployed addresses on Base Sepolia (Issue #11 / deployments/baseSepolia.json)
// with fallbacks to environment variables or sample data placeholders.
export const CONTRACT_ADDRESSES = {
  SolarShareToken: (process.env.NEXT_PUBLIC_SOLAR_SHARE_TOKEN_ADDRESS ||
    "0x025A0eA625e462A4906C9811dcde14075cBD8491") as Address,
  MeterOracle: (process.env.NEXT_PUBLIC_METER_ORACLE_ADDRESS ||
    "0x3e2e7f87610d978b922f5bD18624101d30D7c8B6") as Address,
  RevenueDistributor: (process.env.NEXT_PUBLIC_REVENUE_DISTRIBUTOR_ADDRESS ||
    "0x3CB94fb9C7AaF42c959A414da750dE2DE761942b") as Address,
  ShareSale: (process.env.NEXT_PUBLIC_SHARE_SALE_ADDRESS ||
    "0x652d15FEb0e57730b78A997c8decd46c81bf5cD2") as Address,
  USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address,
};

// Contract ABIs Export
export const CONTRACT_ABIS = {
  SolarShareToken: SolarShareTokenAbi,
  MeterOracle: MeterOracleAbi,
  RevenueDistributor: RevenueDistributorAbi,
  ShareSale: ShareSaleAbi,
  USDC: MockUSDCAbi,
};

// Check if app is explicitly configured or forced to use mock/sample data
export const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === "true";

// ── Unit Formatting Helpers ────────────────────────────────────────────────
export function formatUsdc(amount: bigint): string {
  return Number(formatUnits(amount, USDC_DECIMALS)).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatShares(amount: bigint): string {
  return formatUnits(amount, SHARE_DECIMALS);
}

export function formatEnergyKwh(wattHours: bigint): string {
  const kwh = Number(wattHours) / 1000;
  return kwh.toLocaleString("en-ZA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

// ── Typed Read Helpers ─────────────────────────────────────────────────────

/**
 * Read number of shares owned by a wallet
 */
export async function getSharesOwned(wallet: Address): Promise<{
  shares: bigint;
  formatted: string;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const s = BigInt(sampleData.investors.thandi.shares || "40");
      return { shares: s, formatted: formatShares(s), error: null };
    }

    const shares = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SolarShareToken,
      abi: SolarShareTokenAbi,
      functionName: "balanceOf",
      args: [wallet],
    })) as bigint;

    return { shares, formatted: formatShares(shares), error: null };
  } catch (err: any) {
    console.warn("Failed to read shares owned:", err);
    return { shares: BigInt(0), formatted: "0", error: err.message || "Failed to load shares balance" };
  }
}

/**
 * Read total supply of shares minted/sold so far
 */
export async function getTotalSupply(): Promise<{
  totalSupply: bigint;
  formatted: string;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const ts = BigInt(sampleData.asset.totalSupply);
      return { totalSupply: ts, formatted: formatShares(ts), error: null };
    }

    const totalSupply = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SolarShareToken,
      abi: SolarShareTokenAbi,
      functionName: "totalSupply",
    })) as bigint;

    return { totalSupply, formatted: formatShares(totalSupply), error: null };
  } catch (err: any) {
    console.warn("Failed to read total supply:", err);
    const fallback = BigInt(sampleData.asset.totalSupply);
    return { totalSupply: fallback, formatted: formatShares(fallback), error: err.message || "Failed to fetch total supply" };
  }
}

/**
 * Read current status of the physical MeterOracle (0: OK, 1: THEFT, 2: TAMPER, 3: OFFLINE)
 */
export async function getMeterStatus(): Promise<{
  status: MeterStatus;
  statusLabel: string;
  isPayoutActive: boolean;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const st = sampleData.meter.ok.status as MeterStatus;
      return {
        status: st,
        statusLabel: st === 0 ? "OK" : st === 1 ? "THEFT" : st === 2 ? "TAMPER" : "OFFLINE",
        isPayoutActive: st === MeterStatus.OK,
        error: null,
      };
    }

    const statusNum = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MeterOracle,
      abi: MeterOracleAbi,
      functionName: "status",
    })) as number;

    const status = statusNum as MeterStatus;
    const labels = ["OK", "THEFT", "TAMPER", "OFFLINE"];
    return {
      status,
      statusLabel: labels[status] || "UNKNOWN",
      isPayoutActive: status === MeterStatus.OK,
      error: null,
    };
  } catch (err: any) {
    console.warn("Failed to read meter status:", err);
    return {
      status: MeterStatus.OK,
      statusLabel: "OK (Sample)",
      isPayoutActive: true,
      error: err.message || "Failed to fetch meter status",
    };
  }
}

/**
 * Read full meter state in one call via getMeterState()
 */
export async function getMeterState(): Promise<{
  state: MeterState;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const m = sampleData.meter.ok;
      return {
        state: {
          status: m.status as MeterStatus,
          meterId: m.meterId,
          deviceSigner: m.deviceSigner as Address,
          lastSeq: BigInt(m.lastSeq),
          lastTimestamp: BigInt(m.lastTimestamp),
          totalProducedWh: BigInt(m.totalProducedWh),
          totalSoldWh: BigInt(m.totalSoldWh),
          lastPowerW: m.lastPowerW,
          lastGapBps: m.lastGapBps,
          theftActive: m.theftActive,
          tamperActive: m.tamperActive,
          offline: m.offline,
          theftGapBps: m.theftGapBps,
          offlineTimeout: BigInt(m.offlineTimeout),
        },
        error: null,
      };
    }

    const raw = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MeterOracle,
      abi: MeterOracleAbi,
      functionName: "getMeterState",
    })) as any;

    const state: MeterState = {
      status: Number(raw.status) as MeterStatus,
      meterId: Number(raw.meterId),
      deviceSigner: raw.deviceSigner as Address,
      lastSeq: BigInt(raw.lastSeq),
      lastTimestamp: BigInt(raw.lastTimestamp),
      totalProducedWh: BigInt(raw.totalProducedWh),
      totalSoldWh: BigInt(raw.totalSoldWh),
      lastPowerW: Number(raw.lastPowerW),
      lastGapBps: Number(raw.lastGapBps),
      theftActive: Boolean(raw.theftActive),
      tamperActive: Boolean(raw.tamperActive),
      offline: Boolean(raw.offline),
      theftGapBps: Number(raw.theftGapBps),
      offlineTimeout: BigInt(raw.offlineTimeout),
    };

    return { state, error: null };
  } catch (err: any) {
    console.warn("Failed to read getMeterState:", err);
    const m = sampleData.meter.ok;
    return {
      state: {
        status: m.status as MeterStatus,
        meterId: m.meterId,
        deviceSigner: m.deviceSigner as Address,
        lastSeq: BigInt(m.lastSeq),
        lastTimestamp: BigInt(m.lastTimestamp),
        totalProducedWh: BigInt(m.totalProducedWh),
        totalSoldWh: BigInt(m.totalSoldWh),
        lastPowerW: m.lastPowerW,
        lastGapBps: m.lastGapBps,
        theftActive: m.theftActive,
        tamperActive: m.tamperActive,
        offline: m.offline,
        theftGapBps: m.theftGapBps,
        offlineTimeout: BigInt(m.offlineTimeout),
      },
      error: err.message || "Failed to load onchain meter state",
    };
  }
}

/**
 * Read latest reading struct directly from MeterOracle
 */
export async function getLatestReading(): Promise<{
  reading: MeterReading | null;
  error: string | null;
}> {
  try {
    const raw = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MeterOracle,
      abi: MeterOracleAbi,
      functionName: "latestReading",
    })) as any;

    return {
      reading: {
        meterId: Number(raw.meterId),
        seq: BigInt(raw.seq),
        timestamp: BigInt(raw.timestamp),
        energyProducedWh: BigInt(raw.energyProducedWh),
        energySoldWh: BigInt(raw.energySoldWh),
        powerW: Number(raw.powerW),
        tamper: Boolean(raw.tamper),
      },
      error: null,
    };
  } catch (err: any) {
    return { reading: null, error: err.message || "No reading found" };
  }
}

/**
 * Read claimable USDC payout for an investor wallet
 */
export async function getPendingPayout(wallet: Address): Promise<{
  pendingUsdc: bigint;
  formatted: string;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const p = BigInt(sampleData.investors.thandi.pendingPayoutUsdc || "4859813");
      return { pendingUsdc: p, formatted: formatUsdc(p), error: null };
    }

    const pendingUsdc = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.RevenueDistributor,
      abi: RevenueDistributorAbi,
      functionName: "pendingPayout",
      args: [wallet],
    })) as bigint;

    return { pendingUsdc, formatted: formatUsdc(pendingUsdc), error: null };
  } catch (err: any) {
    return { pendingUsdc: BigInt(0), formatted: "0.00", error: err.message || "Failed to fetch pending payout" };
  }
}

/**
 * Read claim blocker for a wallet (0 = ready to claim)
 */
export async function getClaimBlocker(wallet: Address): Promise<{
  blocker: ClaimBlocker;
  message: string;
  canClaim: boolean;
  error: string | null;
}> {
  try {
    const blockerNum = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.RevenueDistributor,
      abi: RevenueDistributorAbi,
      functionName: "claimBlocker",
      args: [wallet],
    })) as number;

    const blocker = blockerNum as ClaimBlocker;
    const messages: Record<ClaimBlocker, string> = {
      [ClaimBlocker.NONE]: "Ready to claim",
      [ClaimBlocker.NOTHING_TO_CLAIM]: "Nothing to claim yet",
      [ClaimBlocker.METER_NOT_OK]: "Payouts are paused until meter is OK",
      [ClaimBlocker.NOT_APPROVED]: "Wallet not approved",
      [ClaimBlocker.FROZEN]: "Wallet is frozen",
      [ClaimBlocker.PAUSED]: "SolarShare is paused for an emergency",
    };

    return {
      blocker,
      message: messages[blocker] || "Unknown blocker",
      canClaim: blocker === ClaimBlocker.NONE,
      error: null,
    };
  } catch (err: any) {
    return {
      blocker: ClaimBlocker.METER_NOT_OK,
      message: "Check meter status",
      canClaim: false,
      error: err.message,
    };
  }
}

/**
 * Read shares remaining available for purchase from ShareSale
 */
export async function getSharesRemaining(): Promise<{
  remaining: bigint;
  formatted: string;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const r = BigInt(sampleData.asset.sharesRemaining);
      return { remaining: r, formatted: formatShares(r), error: null };
    }

    const remaining = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ShareSale,
      abi: ShareSaleAbi,
      functionName: "sharesRemaining",
    })) as bigint;

    return { remaining, formatted: formatShares(remaining), error: null };
  } catch (err: any) {
    const fallback = BigInt(sampleData.asset.sharesRemaining);
    return { remaining: fallback, formatted: formatShares(fallback), error: err.message || "Failed to fetch shares remaining" };
  }
}

/**
 * Read fixed price per share from ShareSale (USDC, 6 decimals)
 */
export async function getPricePerShare(): Promise<{
  priceUsdc: bigint;
  formatted: string;
  error: string | null;
}> {
  try {
    if (USE_SAMPLE_DATA) {
      const p = BigInt(sampleData.asset.pricePerShareUsdc);
      return { priceUsdc: p, formatted: formatUsdc(p), error: null };
    }

    const priceUsdc = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ShareSale,
      abi: ShareSaleAbi,
      functionName: "pricePerShare",
    })) as bigint;

    return { priceUsdc, formatted: formatUsdc(priceUsdc), error: null };
  } catch (err: any) {
    const fallback = BigInt(sampleData.asset.pricePerShareUsdc);
    return { priceUsdc: fallback, formatted: formatUsdc(fallback), error: err.message || "Failed to fetch price per share" };
  }
}
