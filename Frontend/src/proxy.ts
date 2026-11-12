import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/blog', '/sectors', '/platform', '/compliance'];
  
  // Protected paths and their required roles
  const protectedPaths = {
    '/admin': ['admin'],
    '/worker': ['worker'],
    '/governance': ['governance'], 
    '/dev': ['dev']
  };

  // Check if path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token and user from storage (for client-side requests)
  const token = request.cookies.get('gridguard_token')?.value;
  const userCookie = request.cookies.get('gridguard_user')?.value;
  
  if (!token || !userCookie) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const user = JSON.parse(userCookie);
    const userRole = user.role;

    // Check role-based access
    for (const [path, allowedRoles] of Object.entries(protectedPaths)) {
      if (pathname.startsWith(path)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect to appropriate dashboard based on role
          let redirectPath = '/admin'; // default
          switch (userRole) {
            case 'worker':
              redirectPath = '/worker';
              break;
            case 'governance':
              redirectPath = '/governance';
              break;
            case 'dev':
              redirectPath = '/dev';
              break;
            case 'admin':
              redirectPath = '/admin';
              break;
          }
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid user data, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
