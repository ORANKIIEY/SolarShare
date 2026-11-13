import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SolarShare Edge Route Protection & Middleware Proxy
 *
 * NOTE: Cookie-based client role checks like this are demo-grade for prototype demonstration.
 * Production requires server-verified sessions / cryptographically signed JWTs with tamper-proof claims,
 * secure httpOnly SameSite=Strict cookies, and server-side RBAC validation against the database or identity provider.
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check Public Paths
  // Match '/' exactly, and for other public paths use exact match or subpath prefix (p + '/')
  // This ensures '/loginx' or '/solarfoo' do NOT accidentally match as public.
  const isExactRoot = pathname === '/';
  const publicPrefixes = [
    '/login',
    '/signup',
    '/solar',
    '/blog',
    '/sectors',
    '/platform',
    '/compliance',
  ];

  const isPublic = isExactRoot || publicPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // 2. Read Authentication Cookies
  const token = request.cookies.get('solarshare_token')?.value;
  const userCookie = request.cookies.get('solarshare_user')?.value;

  if (!token || !userCookie) {
    // Unauthenticated: redirect to /login with next parameter preserving target destination
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    const userRole = user.role || 'investor';

    // 3. Protected Routes & Role Authorization
    // SolarShare Roles:
    // - 'operator': System operator managing solar assets, revenue deposits, tariffs, and meter statuses
    // - 'investor': Community co-owner holding shares and receiving payouts
    // - 'admin' / legacy roles supported for maintenance consoles
    const protectedRoutes: Record<string, string[]> = {
      '/operator': ['operator', 'admin'],
      '/admin': ['operator', 'admin'],
      '/worker': ['worker', 'operator', 'admin'],
      '/governance': ['governance', 'operator', 'admin'],
      '/dev': ['dev', 'operator', 'admin'],
    };

    for (const [routePath, allowedRoles] of Object.entries(protectedRoutes)) {
      if (pathname === routePath || pathname.startsWith(routePath + '/')) {
        if (!allowedRoles.includes(userRole)) {
          // Unauthorized role: redirect to safe investor landing page
          return NextResponse.redirect(new URL('/solar', request.url));
        }
      }
    }

    return NextResponse.next();
  } catch {
    // Malformed user cookie: clear session and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, icons
     * - public assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)).*)',
  ],
};
