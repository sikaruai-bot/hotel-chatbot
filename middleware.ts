import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenEdge, ADMIN_COOKIE_NAME } from '@/lib/auth/edgeAuth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public admin auth endpoints & login page
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/auth/')
  ) {
    return NextResponse.next();
  }

  // 2. Inspect session cookie
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authHeader = req.headers.get('authorization');
  let isAuthenticated = false;

  if (cookieToken) {
    const result = await verifyAdminTokenEdge(cookieToken);
    if (result.valid) {
      isAuthenticated = true;
    }
  }

  // Check Bearer authorization if present
  if (!isAuthenticated && authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    const tokenResult = await verifyAdminTokenEdge(bearer);
    if (tokenResult.valid) {
      isAuthenticated = true;
    }
  }

  // 3. Handle unauthorized requests
  if (!isAuthenticated) {
    // If it's an API request, return 401 JSON
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Staff session required to access administrative APIs.' },
        { status: 401 }
      );
    }

    // If it's a browser request to /admin/*, redirect to /admin/login
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
