/**
 * Edge-compatible admin authentication helpers for Next.js Middleware.
 * Strictly uses Web Standards (Web Crypto API, atob, TextEncoder) without Node.js runtime dependencies.
 */

export const ADMIN_COOKIE_NAME = 'hss_admin_token';

/**
 * Verifies an admin token using standard Web Crypto API (supported on Next.js Edge Runtime).
 */
export async function verifyAdminTokenEdge(
  token?: string | null,
  overrideSecret?: string
): Promise<{ valid: boolean; payload?: any }> {
  if (!token || typeof token !== 'string') return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return { valid: false };

  try {
    // 1. Decode & parse payload
    const base64Payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padPayload = base64Payload.padEnd(base64Payload.length + (4 - (base64Payload.length % 4)) % 4, '=');
    const rawPayload = atob(padPayload);
    const payload = JSON.parse(rawPayload);

    // 2. Expiry validation
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }

    // 3. Resolve Secret
    const isProd = process.env.NODE_ENV === 'production';
    const secret = overrideSecret || process.env.ADMIN_SECRET_KEY;

    if (isProd) {
      if (!secret || secret.trim().length < 32) {
        return { valid: false };
      }
    }

    const effectiveSecret = secret || 'sherpa_soul_dev_admin_secret_key_32chars!';

    // 4. Web Crypto HMAC SHA-256 Signature Verification
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(effectiveSecret.trim()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    const base64Sig = signature.replace(/-/g, '+').replace(/_/g, '/');
    const padSig = base64Sig.padEnd(base64Sig.length + (4 - (base64Sig.length % 4)) % 4, '=');
    const binStr = atob(padSig);
    const sigBytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      sigBytes[i] = binStr.charCodeAt(i);
    }

    const dataBytes = encoder.encode(payloadB64);
    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, dataBytes);

    if (!isValid) return { valid: false };

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
