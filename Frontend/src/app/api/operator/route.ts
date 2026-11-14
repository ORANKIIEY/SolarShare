// Operator-only API. proxy.ts already blocks signed-out requests; every
// handler checks the session again anyway.
//   GET  -> applications, the operator's balances, sponsor health
//   POST { action, ... } -> one admin transaction, signed on this server
import type { NextRequest } from "next/server";
import { parseUnits } from "viem";
import { big, isOperator, json, parseAddress, sameOrigin, sponsorUrl } from "@/lib/server/http";
import * as op from "@/lib/server/operator";
import { listApplicants, setApplicantStatus } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isOperator(req))) return json({ ok: false, error: "SIGNED_OUT" }, 401);
  const [applicants, balances, sponsor] = await Promise.all([
    listApplicants(),
    op.operatorBalances().catch(() => null),
    fetch(`${sponsorUrl()}/health`, { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .catch(() => null),
  ]);
  return json(big({ ok: true, applicants: applicants.sort((a, b) => b.createdAt - a.createdAt), balances, sponsor }));
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ ok: false, error: "FORBIDDEN" }, 403);
  if (!(await isOperator(req))) return json({ ok: false, error: "SIGNED_OUT" }, 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const address = parseAddress(body.address);
  const need = () => json({ ok: false, error: "BAD_REQUEST", message: "A valid account address is needed." }, 400);

  let res: op.TxResult;
  switch (body.action) {
    case "approve":
      if (!address) return need();
      res = await op.approveWallet(address);
      if (res.ok) await setApplicantStatus(address, "approved", res.txHashes[0]);
      break;
    case "reject":
      if (!address) return need();
      await setApplicantStatus(address, "rejected");
      return json({ ok: true, txHashes: [] });
    case "revoke":
      if (!address) return need();
      res = await op.revokeWallet(address);
      if (res.ok) await setApplicantStatus(address, "rejected", res.txHashes[0]);
      break;
    case "freeze":
      if (!address) return need();
      res = await op.freeze(address);
      break;
    case "unfreeze":
      if (!address) return need();
      res = await op.unfreeze(address);
      break;
    case "recover": {
      const to = parseAddress(body.newAddress);
      if (!address || !to) return need();
      res = await op.recover(address, to);
      break;
    }
    case "clearTamper":
      res = await op.clearTamper();
      break;
    case "deposit": {
      let amount: bigint;
      try {
        amount = parseUnits(String(body.amountUsdc ?? ""), 6);
      } catch {
        return json({ ok: false, error: "BAD_REQUEST", message: "Enter an amount like 0.05" }, 400);
      }
      if (amount <= 0n) return json({ ok: false, error: "BAD_REQUEST", message: "Enter an amount above 0" }, 400);
      res = await op.deposit(amount);
      break;
    }
    default:
      return json({ ok: false, error: "BAD_REQUEST", message: "Unknown action" }, 400);
  }
  return json(res, res.ok ? 200 : res.code === "config" ? 500 : 409);
}
