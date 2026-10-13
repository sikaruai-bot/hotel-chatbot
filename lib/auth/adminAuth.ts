import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Cookie & session timing configuration
const COOKIE_NAME = 'hss_admin_token';
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Retrieves and validates the server-side ADMIN_SECRET_KEY.
 * - In PRODUCTION (NODE_ENV === 'production'):
 *   Strictly enforces that ADMIN_SECRET_KEY is present and at least 32 characters long.
 *   Throws an error if missing or weak. Never uses a hardcoded fallback.
 * - In DEVELOPMENT / TEST (NODE_ENV !== 'production'):
 *   Uses process.env.ADMIN_SECRET_KEY if set, otherwise falls back to a development secret.
 */
export function getAdminSecretKey(): string {
  const secret = process.env.ADMIN_SECRET_KEY;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
      throw new Error(
        'SECURITY MISCONFIGURATION: ADMIN_SECRET_KEY is mandatory and must be at least 32 characters in production.'
      );
    }
    return secret.trim();
  }

  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  return 'sherpa_soul_dev_admin_secret_key_32chars!';
}

export interface AdminSessionPayload {
  adminId: string;
  role: 'ADMIN' | 'MANAGER' | 'FRONT_DESK';
  iat: number;
  exp: number;
  nonce: string;
}

// In-memory rate limiter for login attempts: Max 5 attempts per 15 minutes per IP
interface LoginAttemptRecord {
  attempts: number;
  blockedUntil?: number;
  resetAt: number;
}
const loginRateLimitMap = new Map<string, LoginAttemptRecord>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = loginRateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    loginRateLimitMap.set(ip, { attempts: 0, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, remainingMs: record.blockedUntil - now };
  }

  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + windowMs;
    return { allowed: false, remainingMs: windowMs };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = loginRateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    loginRateLimitMap.set(ip, { attempts: 1, resetAt: now + windowMs });
  } else {
    record.attempts += 1;
    if (record.attempts >= 5) {
      record.blockedUntil = now + windowMs;
    }
  }
}

export function resetLoginAttempts(ip: string) {
  loginRateLimitMap.delete(ip);
}

/**
 * Constant-time comparison between input key and configured ADMIN_SECRET_KEY.
 * Prevents timing-attack disclosure of the secret length or characters.
 */
export function verifyAdminSecret(inputKey: string): boolean {
  if (!inputKey || typeof inputKey !== 'string') return false;
  try {
    const secret = getAdminSecretKey();
    const inputBuf = Buffer.from(inputKey, 'utf8');
    const secretBuf = Buffer.from(secret, 'utf8');

    if (inputBuf.length !== secretBuf.length) {
      // Perform dummy timing-safe comparison to avoid early length leak
      crypto.timingSafeEqual(inputBuf, inputBuf);
      return false;
    }

    return crypto.timingSafeEqual(inputBuf, secretBuf);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically signed HMAC SHA-256 session token.
 */
export function signAdminToken(role: 'ADMIN' | 'MANAGER' | 'FRONT_DESK' = 'ADMIN'): { token: string; expiresAt: number } {
  const now = Date.now();
  const expiresAt = now + SESSION_EXPIRY_MS;
  const payload: AdminSessionPayload = {
    adminId: 'staff_' + crypto.randomBytes(4).toString('hex'),
    role,
    iat: now,
    exp: expiresAt,
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAdminSecretKey())
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${signature}`,
    expiresAt,
  };
}

/**
 * Verify a signed admin session token.
 */
export function verifyAdminToken(token?: string | null): { valid: boolean; payload?: AdminSessionPayload; expired?: boolean } {
  if (!token || typeof token !== 'string') return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [payloadB64, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', getAdminSecretKey())
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length) return { valid: false };
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return { valid: false };

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: AdminSessionPayload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, expired: true };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Validates an admin request by inspecting cookies and Authorization header.
 * Designed for independent use inside every sensitive `/api/admin/*` route.
 */
export function validateAdminRequest(req: NextRequest): { authenticated: boolean; error?: string; payload?: AdminSessionPayload } {
  // 1. Check Session Cookie
  let cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookieToken) {
    const rawCookie = req.headers.get('cookie') || req.headers.get('Cookie');
    if (rawCookie) {
      const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      if (match) cookieToken = decodeURIComponent(match[1].trim());
    }
  }

  if (cookieToken) {
    const result = verifyAdminToken(cookieToken);
    if (result.valid && result.payload) {
      return { authenticated: true, payload: result.payload };
    }
    if (result.expired) {
      return { authenticated: false, error: 'Session expired. Please log in again.' };
    }
  }

  // 2. Check Bearer Authorization Header (e.g. for secure staff scripts / test automation)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerValue = authHeader.slice(7).trim();

    // Check if bearerValue is a signed session token
    const tokenResult = verifyAdminToken(bearerValue);
    if (tokenResult.valid && tokenResult.payload) {
      return { authenticated: true, payload: tokenResult.payload };
    }

    // Check if bearerValue is the direct ADMIN_SECRET_KEY
    if (verifyAdminSecret(bearerValue)) {
      return {
        authenticated: true,
        payload: {
          adminId: 'staff_api_key',
          role: 'ADMIN',
          iat: Date.now(),
          exp: Date.now() + 60000,
          nonce: 'direct_key',
        },
      };
    }
  }

  return { authenticated: false, error: 'Unauthorized: Valid staff session required' };
}

export function getAdminCookieConfig(expiresAt: number) {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(expiresAt),
  };
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
