// Passes "top up this new investor" requests to the sponsor service (#16),
// which runs next to the relayer: `npm run sponsor` in Blockchain/. Going
// through our own server means the browser never needs to reach port 8787.
import type { NextRequest } from "next/server";
import { json, parseAddress, rateLimited, sameOrigin, sponsorUrl } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ ok: false, error: "FORBIDDEN" }, 403);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const address = parseAddress(body.address);
  if (!address) return json({ ok: false, error: "BAD_REQUEST" }, 400);
  if (rateLimited(`sponsor:${address}`, 5, 10 * 60_000)) return json({ ok: false, error: "BUSY" }, 429);
  try {
    const res = await fetch(`${sponsorUrl()}/sponsor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
      signal: AbortSignal.timeout(45_000),
    });
    return json(await res.json(), res.status);
  } catch {
    return json({ ok: false, error: "SPONSOR_DOWN", message: "The sponsor service is not running." }, 503);
  }
}
