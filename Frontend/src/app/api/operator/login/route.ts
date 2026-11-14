import type { NextRequest } from "next/server";
import { SESSION_COOKIE, checkPassword, createSession } from "@/lib/server/auth";
import { json, rateLimited, sameOrigin } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ ok: false, error: "FORBIDDEN" }, 403);
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(`login:${ip}`, 10, 15 * 60_000)) return json({ ok: false, error: "BUSY" }, 429);
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (!(await checkPassword(String(body.password ?? "")))) return json({ ok: false, error: "WRONG_PASSWORD" }, 401);
  const s = await createSession();
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, s.value, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: s.maxAge,
  });
  return res;
}

export async function DELETE() {
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
