import crypto from 'crypto';
import { getAdminSecretKey } from './adminAuth';

/**
 * Creates an HMAC-SHA256 signed session token for a specific conversationId.
 * Format: `${conversationId}.${hmacSignature}`
 */
export function createVisitorSessionToken(conversationId: string): string {
  if (!conversationId) throw new Error('conversationId required to sign visitor session');
  const secret = getAdminSecretKey();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`visitor_session:${conversationId}`)
    .digest('base64url');

  return `${conversationId}.${signature}`;
}

/**
 * Verifies a visitor session token in constant time.
 * Confirms that the token was signed by the server for that exact conversationId.
 */
export function verifyVisitorSessionToken(token?: string | null): { isValid: boolean; conversationId?: string } {
  if (!token || typeof token !== 'string') return { isValid: false };

  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return { isValid: false };

  const conversationId = token.slice(0, dotIdx);
  const signature = token.slice(dotIdx + 1);

  if (!conversationId || !signature) return { isValid: false };

  try {
    const secret = getAdminSecretKey();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`visitor_session:${conversationId}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length) return { isValid: false };
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return { isValid: false };

    return { isValid: true, conversationId };
  } catch {
    return { isValid: false };
  }
}
