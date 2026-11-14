// Investor applications after the (mocked) ID check.
//   POST { address, name, phoneLast4 } -> saves it; with DEMO_AUTO_APPROVE=1
//        the operator key approves the account onchain straight away.
//   GET  ?address=0x… -> that one application's status.
import type { NextRequest } from "next/server";
import { publicClient, token } from "@/lib/chain";
import { json, parseAddress, rateLimited, sameOrigin } from "@/lib/server/http";
import { approveWallet } from "@/lib/server/operator";
import { getApplicant, setApplicantStatus, upsertApplicant } from "@/lib/server/store";

export const runtime = "nodejs";

const autoApprove = () => process.env.DEMO_AUTO_APPROVE === "1";

export async function GET(req: NextRequest) {
  const address = parseAddress(req.nextUrl.searchParams.get("address"));
  if (!address) return json({ ok: false, error: "BAD_REQUEST" }, 400);
  const [row, approved] = await Promise.all([
    getApplicant(address),
    publicClient.readContract({ ...token, functionName: "isApproved", args: [address] }) as Promise<boolean>,
  ]);
  return json({ ok: true, status: approved ? "approved" : (row?.status ?? "none"), autoApprove: autoApprove() });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ ok: false, error: "FORBIDDEN" }, 403);
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(`apply:${ip}`, 20, 60 * 60_000)) return json({ ok: false, error: "BUSY" }, 429);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const address = parseAddress(body.address);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phoneLast4 = typeof body.phoneLast4 === "string" ? body.phoneLast4.replace(/\D/g, "").slice(-4) : "";
  if (!address || !name || phoneLast4.length !== 4) return json({ ok: false, error: "BAD_REQUEST" }, 400);

  const row = await upsertApplicant({ address, name, phoneLast4 });
  const already = (await publicClient.readContract({ ...token, functionName: "isApproved", args: [address] })) as boolean;
  if (already) {
    await setApplicantStatus(address, "approved");
    return json({ ok: true, status: "approved" });
  }
  if (!autoApprove() || row.status === "rejected") return json({ ok: true, status: row.status });

  const res = await approveWallet(address);
  if (!res.ok) return json({ ok: false, error: res.code, status: "pending" }, 502);
  await setApplicantStatus(address, "approved", res.txHashes[0]);
  return json({ ok: true, status: "approved", txHash: res.txHashes[0] });
}
