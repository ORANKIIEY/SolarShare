import { ZAR_PER_USD } from "./chain";

/** USDC (6 decimals) as a plain number of dollars. */
export const usdcToNumber = (raw: bigint) => Number(raw) / 1e6;

/** "R1,650" or "R10.60". Fixed locale so server and browser agree. */
export function rand(amount: number, decimals = amount < 100 ? 2 : 0): string {
  return `R${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export const usdcToRand = (raw: bigint) => usdcToNumber(raw) * ZAR_PER_USD;

export const int = (n: number | bigint) => Number(n).toLocaleString("en-US");

export const kw = (watts: number) => `${(watts / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} kW`;

export const kwh = (wh: bigint | number) =>
  `${(Number(wh) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })} kWh`;

export const pct = (bps: number) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

export const fromUnix = (s: bigint) => new Date(Number(s) * 1000);

/** "12 Nov, 13:33" in the viewer's own timezone. */
export function dateTime(d: Date, locale = "en-ZA"): string {
  return d.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Seconds/minutes/hours/days since a date, for "x ago" labels. */
export function since(d: Date, now = Date.now()): { value: number; unit: "s" | "m" | "h" | "d" } {
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 60) return { value: s, unit: "s" };
  if (s < 3600) return { value: Math.floor(s / 60), unit: "m" };
  if (s < 86400) return { value: Math.floor(s / 3600), unit: "h" };
  return { value: Math.floor(s / 86400), unit: "d" };
}
