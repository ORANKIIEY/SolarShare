import { NextResponse, type NextRequest } from "next/server";
import { getAddress, isAddress, type Address } from "viem";
import { SESSION_COOKIE, verifySession } from "./auth";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** bigint-safe: amounts go out as strings. */
export const big = (o: unknown): unknown =>
  JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

export function parseAddress(v: unknown): Address | null {
  return typeof v === "string" && isAddress(v) ? getAddress(v) : null;
}

export async function isOperator(req: NextRequest): Promise<boolean> {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Only accept state-changing requests from our own pages. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers may omit it
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Tiny in-memory rate limit per key (fine for one demo server). */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

/** The sponsor service (#16), run with `npm run sponsor` in Blockchain/. */
export const sponsorUrl = () => (process.env.SPONSOR_URL?.trim() || "http://127.0.0.1:8787").replace(/\/$/, "");
