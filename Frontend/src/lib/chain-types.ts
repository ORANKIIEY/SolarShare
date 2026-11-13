// SolarShare contract interface: TypeScript types for the frontend.
// Copied and adapted from Blockchain/interface/types.ts

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
  seq: bigint; // uint64
  timestamp: bigint; // uint64, Unix seconds
  energyProducedWh: bigint; // uint64
  energySoldWh: bigint; // uint64
  powerW: number; // uint32
  tamper: boolean;
}

/** Everything the meter screens need: MeterOracle.getMeterState(). */
export interface MeterState {
  status: MeterStatus;
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

// ---------------------------------------------------------------------------
// SolarShareToken
// ---------------------------------------------------------------------------

export interface AssetDocument {
  name: string;
  sha256Hash: Hex;
  uri: string;
  updatedAt: bigint;
}

export const DOCUMENT_NAMES = [
  "SPV_CERTIFICATE",
  "INSTALLATION_CERTIFICATE",
  "POWER_PURCHASE_AGREEMENT",
] as const;
export type DocumentName = (typeof DOCUMENT_NAMES)[number];

// ---------------------------------------------------------------------------
// RevenueDistributor
// ---------------------------------------------------------------------------

export enum ClaimBlocker {
  NONE = 0,
  NOTHING_TO_CLAIM = 1,
  METER_NOT_OK = 2,
  NOT_APPROVED = 3,
  FROZEN = 4,
  PAUSED = 5,
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
// View Models
// ---------------------------------------------------------------------------

export interface AssetPageData {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: bigint;
  totalSupply: bigint;
  sharesRemaining: bigint;
  pricePerShareUsdc: bigint;
  tariffUsdcPerKwh: bigint;
  totalDepositedUsdc: bigint;
  depositCapUsdc: bigint;
  documents: AssetDocument[];
  meter: MeterState;
}

export interface MySharesData {
  account: Address;
  shares: bigint;
  ownershipBps: number;
  pendingPayoutUsdc: bigint;
  claimBlocker: ClaimBlocker;
  isApproved: boolean;
  isFrozen: boolean;
  usdcBalance: bigint;
}

// ---------------------------------------------------------------------------
// Network Constants
// ---------------------------------------------------------------------------

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_USDC: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const USDC_DECIMALS = 6;
export const SHARE_DECIMALS = 0;
export const MAX_SUPPLY = BigInt(3500);
export const MAX_POWER_W = 10_000;
