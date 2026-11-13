// Rate limits and spending caps for the sponsor, with a small ledger saved to
// disk so a restart doesn't reset them.
import fs from "node:fs";
import path from "node:path";
import { getAddress, type Address } from "viem";

export interface SponsorLimits {
  /** Top-ups one wallet may get per window. */
  perWalletMax: number;
  perWalletWindowS: number;
  /** Top-ups for all wallets together per hour. */
  globalMaxPerHour: number;
  /** Most ETH (wei) / USDC (6 decimals) the sponsor will ever give away in total. */
  totalEthCapWei: bigint;
  totalUsdcCap: bigint;
}

export interface LedgerEntry {
  address: Address;
  /** Unix seconds. */
  at: number;
  ethWei: string;
  usdc: string;
}

interface LedgerFile {
  totalEthWei: string;
  totalUsdc: string;
  /** Recent top-ups (older ones are pruned once no window needs them). */
  entries: LedgerEntry[];
}

export type LimitVerdict =
  | { ok: true }
  | { ok: false; code: "WALLET_LIMIT" | "BUSY"; retryAfterS: number; message: string }
  | { ok: false; code: "BUDGET_SPENT"; message: string };

const HOUR = 3600;

export class SponsorLedger {
  private data: LedgerFile = { totalEthWei: "0", totalUsdc: "0", entries: [] };

  /** `file` undefined = memory only (tests). */
  constructor(private readonly file?: string) {
    if (file && fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, "utf8"));
    }
  }

  get totalEthWei(): bigint {
    return BigInt(this.data.totalEthWei);
  }
  get totalUsdc(): bigint {
    return BigInt(this.data.totalUsdc);
  }
  get entries(): readonly LedgerEntry[] {
    return this.data.entries;
  }

  /** Can `address` get a top-up of `ethWei` now? (USDC over its cap is trimmed, not refused.) */
  check(address: Address, ethWei: bigint, limits: SponsorLimits, now: number): LimitVerdict {
    const who = getAddress(address);
    const mine = this.data.entries.filter((e) => e.address === who && e.at > now - limits.perWalletWindowS);
    if (mine.length >= limits.perWalletMax) {
      const oldest = Math.min(...mine.map((e) => e.at));
      return {
        ok: false,
        code: "WALLET_LIMIT",
        retryAfterS: Math.max(1, oldest + limits.perWalletWindowS - now),
        message: `This wallet was already topped up ${mine.length} time(s) in the last ${fmtWindow(limits.perWalletWindowS)}.`,
      };
    }
    const recent = this.data.entries.filter((e) => e.at > now - HOUR);
    if (recent.length >= limits.globalMaxPerHour) {
      const oldest = Math.min(...recent.map((e) => e.at));
      return {
        ok: false,
        code: "BUSY",
        retryAfterS: Math.max(1, oldest + HOUR - now),
        message: `The sponsor has reached its limit of ${limits.globalMaxPerHour} top-ups per hour.`,
      };
    }
    if (ethWei > 0n && this.totalEthWei + ethWei > limits.totalEthCapWei) {
      return { ok: false, code: "BUDGET_SPENT", message: "The sponsor's total ETH budget is used up." };
    }
    return { ok: true };
  }

  /** USDC still allowed under the total cap. */
  usdcRoom(limits: SponsorLimits): bigint {
    const room = limits.totalUsdcCap - this.totalUsdc;
    return room > 0n ? room : 0n;
  }

  record(address: Address, ethWei: bigint, usdc: bigint, now: number, limits: SponsorLimits): void {
    this.data.totalEthWei = (this.totalEthWei + ethWei).toString();
    this.data.totalUsdc = (this.totalUsdc + usdc).toString();
    const keep = Math.max(limits.perWalletWindowS, HOUR);
    this.data.entries = this.data.entries.filter((e) => e.at > now - keep);
    this.data.entries.push({ address: getAddress(address), at: now, ethWei: ethWei.toString(), usdc: usdc.toString() });
    this.save();
  }

  private save(): void {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2) + "\n");
    fs.renameSync(tmp, this.file);
  }
}

function fmtWindow(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400} day(s)`;
  if (seconds % HOUR === 0) return `${seconds / HOUR} hour(s)`;
  return `${seconds} s`;
}
