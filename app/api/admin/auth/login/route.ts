import { NextRequest, NextResponse } from 'next/server';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  verifyAdminSecret,
  signAdminToken,
  ADMIN_COOKIE_NAME,
} from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';

    // 1. Rate-limit login attempts per IP
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      const waitMin = Math.ceil((rateCheck.remainingMs || 900000) / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Please try again in ${waitMin} minutes.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { secretKey } = body;

    if (!secretKey || typeof secretKey !== 'string') {
      recordFailedLogin(clientIp);
      return NextResponse.json(
        { error: 'Staff access key is required.' },
        { status: 400 }
      );
    }

    // 2. Validate key with constant-time comparison
    const isValid = verifyAdminSecret(secretKey.trim());
    if (!isValid) {
      recordFailedLogin(clientIp);
      // Safety rule 7: Do not log secrets, passwords, or personal details
      console.warn(`[Admin Auth] Failed login attempt from IP ${clientIp}`);
      return NextResponse.json(
        { error: 'Invalid staff credentials.' },
        { status: 401 }
      );
    }

    // 3. Reset rate limit counter on success
    resetLoginAttempts(clientIp);

    // 4. Issue cryptographically signed session token
    const { token, expiresAt } = signAdminToken('ADMIN');

    const response = NextResponse.json({
      success: true,
      message: 'Authenticated successfully.',
      expiresAt,
    });

    // 5. Set secure, HttpOnly session cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expiresAt),
    });

    return response;
  } catch (error: any) {
    console.error('[Admin Auth] Login error:', error.message);
    return NextResponse.json(
      { error: 'Internal authentication error.' },
      { status: 500 }
    );
  }
}
