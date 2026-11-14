// Route protection (#18). Everything is public except the operator area.
// Paths are matched exactly or by "prefix + /", never with a bare
// startsWith("/"), which would match every page.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/auth";

const OPEN = new Set(["/solar/operator/login", "/api/operator/login"]);

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const guarded = under(pathname, "/solar/operator") || under(pathname, "/api/operator");
  if (!guarded || OPEN.has(pathname)) return NextResponse.next();

  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "SIGNED_OUT" }, { status: 401 });
  }
  const login = new URL("/solar/operator/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/solar/operator/:path*", "/api/operator/:path*"],
};
