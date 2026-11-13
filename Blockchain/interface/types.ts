// SolarShare contract interface: TypeScript types for the frontend.
//
// These match the Solidity contracts in ../contracts. Read README.md in this
// folder for what each value means and which screen uses it.
//
// Number conventions (important):
// - Shares have 0 decimals. 1 share = 1n. Total supply can never pass 3,500.
// - USDC has 6 decimals. 5 USDC = 5_000_000n. Format with formatUnits(x, 6).
// - Energy is in watt-hours (Wh). 1 kWh = 1,000 Wh.
// - Power is in watts (W). The system is rated 10 kW, so at most 10,000 W.
// - Times are Unix seconds (bigint). Multiply by 1000 for a JS Date.
// - "Bps" means basis points: 10,000 bps = 100%, 1,500 bps = 15%.
//
// viem returns uint64/uint256 as bigint and uint8/uint32 as number.

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

// ---------------------------------------------------------------------------
// MeterOracle
// ---------------------------------------------------------------------------

/** Meter status as returned by MeterOracle.status(). The number is what the chain returns. */
export enum MeterStatus {
  /** Everything normal. Payouts can be claimed. */
  OK = 0,
  /** Sold energy is too far below produced energy (someone is taking power). Clears by itself. */
  THEFT = 1,
  /** The meter reported its case was opened. An admin must clear it after an inspection. */
  TAMPER = 2,
  /** No reading for longer than offlineTimeout seconds. Clears with the next good reading. */
  OFFLINE = 3,
}

export const METER_STATUS_LABEL: Record<MeterStatus, string> = {
  [MeterStatus.OK]: "OK",
  [MeterStatus.THEFT]: "THEFT",
  [MeterStatus.TAMPER]: "TAMPER",
  [MeterStatus.OFFLINE]: "OFFLINE",
};

/** One signed meter reading. Totals are cumulative since the meter was installed. */
export interface MeterReading {
  meterId: number; // uint32
  seq: bigint; // uint64, goes up by at least 1 every reading
  timestamp: bigint; // uint64, Unix seconds (device clock)
  energyProducedWh: bigint; // uint64, total ever produced by the panels
  energySoldWh: bigint; // uint64, total ever sold to (paid for by) neighbours
  powerW: number; // uint32, power right now
  tamper: boolean; // true if the device detected its case was opened
}

/** Everything the meter screens need, in one call: MeterOracle.getMeterState(). */
export interface MeterState {
  status: MeterStatus;
  meterId: number;
  deviceSigner: Address; // the meter's own blockchain address (its signing key)
  lastSeq: bigint;
  lastTimestamp: bigint; // when the last reading was taken (0n if none yet)
  totalProducedWh: bigint;
  totalSoldWh: bigint;
  lastPowerW: number;
  lastGapBps: number; // how much sold was below produced in the last reading (bps)
  theftActive: boolean;
  tamperActive: boolean;
  offline: boolean;
  theftGapBps: number; // threshold for THEFT, default 1500 (15%)
  offlineTimeout: bigint; // seconds, default 600
}

// ---------------------------------------------------------------------------
// SolarShareToken
// ---------------------------------------------------------------------------

/** A legal document about the asset. The hash proves the file wasn't changed. */
export interface AssetDocument {
  name: string; // e.g. "SPV_CERTIFICATE"
  sha256Hash: Hex; // bytes32: SHA-256 of the PDF
  uri: string; // e.g. "ipfs://bafy..."
  updatedAt: bigint; // Unix seconds
}

/** Document names the deploy script and the operator use. */
export const DOCUMENT_NAMES = [
  "SPV_CERTIFICATE",
  "INSTALLATION_CERTIFICATE",
  "POWER_PURCHASE_AGREEMENT",
] as const;
export type DocumentName = (typeof DOCUMENT_NAMES)[number];

// ---------------------------------------------------------------------------
// RevenueDistributor
// ---------------------------------------------------------------------------

/** Why a wallet can't claim right now: RevenueDistributor.claimBlocker(account). */
export enum ClaimBlocker {
  NONE = 0, // can claim
  NOTHING_TO_CLAIM = 1,
  METER_NOT_OK = 2, // THEFT, TAMPER or OFFLINE
  NOT_APPROVED = 3,
  FROZEN = 4,
  PAUSED = 5, // the share token is paused
}

export const CLAIM_BLOCKER_MESSAGE: Record<ClaimBlocker, string> = {
  [ClaimBlocker.NONE]: "Ready to claim",
  [ClaimBlocker.NOTHING_TO_CLAIM]: "Nothing to claim yet",
  [ClaimBlocker.METER_NOT_OK]: "Payouts are paused until the meter is OK",
  [ClaimBlocker.NOT_APPROVED]: "Your wallet is not approved",
  [ClaimBlocker.FROZEN]: "Your wallet is frozen",
  [ClaimBlocker.PAUSED]: "SolarShare is paused for an emergency",
};

// ---------------------------------------------------------------------------
// Screen-level view models (what the app shows; built from several reads)
// ---------------------------------------------------------------------------

export interface AssetPageData {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: bigint; // 3500n
  totalSupply: bigint; // shares sold so far
  sharesRemaining: bigint;
  pricePerShareUsdc: bigint; // 6 decimals
  tariffUsdcPerKwh: bigint; // 6 decimals
  totalDepositedUsdc: bigint;
  depositCapUsdc: bigint;
  documents: AssetDocument[];
  meter: MeterState;
}

export interface MySharesData {
  account: Address;
  shares: bigint;
  ownershipBps: number; // shares * 10000 / totalSupply
  pendingPayoutUsdc: bigint;
  claimBlocker: ClaimBlocker;
  isApproved: boolean;
  isFrozen: boolean;
  usdcBalance: bigint;
}

// ---------------------------------------------------------------------------
// Events (decoded log args)
// ---------------------------------------------------------------------------

export interface SharesPurchasedEvent { buyer: Address; amount: bigint; cost: bigint }
export interface IncomeDepositedEvent { by: Address; amount: bigint; totalDeposited: bigint; rewardPerShare: bigint }
export interface PayoutClaimedEvent { account: Address; amount: bigint }
export interface ReadingAcceptedEvent {
  meterId: number; seq: bigint; timestamp: bigint; energyProducedWh: bigint;
  energySoldWh: bigint; powerW: number; tamper: boolean; gapBps: number;
}
export interface StatusChangedEvent { previous: MeterStatus; current: MeterStatus }
export interface TheftDetectedEvent {
  meterId: number; seq: bigint; deltaProducedWh: bigint; deltaSoldWh: bigint; gapBps: number;
}

// ---------------------------------------------------------------------------
// Network constants
// ---------------------------------------------------------------------------

export const BASE_SEPOLIA_CHAIN_ID = 84532;
/** Circle's test USDC on Base Sepolia (from developers.circle.com). */
export const BASE_SEPOLIA_USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const USDC_DECIMALS = 6;
export const SHARE_DECIMALS = 0;
export const MAX_SUPPLY = 3500n;
export const MAX_POWER_W = 10_000;
