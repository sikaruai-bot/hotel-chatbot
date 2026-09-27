import crypto from 'crypto';

export function verifyWebhookChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { isValid: boolean; challenge?: string } {
  const expectedToken = process.env.META_VERIFY_TOKEN;
  if (expectedToken && mode === 'subscribe' && token === expectedToken && challenge) {
    return { isValid: true, challenge };
  }
  return { isValid: false };
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret?: string
): boolean {
  const secret = appSecret || process.env.META_APP_SECRET;
  if (!secret) return true; // Skip if no secret set in local development
  if (!signatureHeader) return false;

  const parts = signatureHeader.split('sha256=');
  if (parts.length !== 2) return false;
  const expectedSignature = parts[1];

  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf-8')
    .digest('hex');

  try {
    const calcBuf = Buffer.from(calculatedSignature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    if (calcBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(calcBuf, expBuf);
  } catch (err) {
    console.error('[Meta Verification] Signature verification error:', err);
    return false;
  }
}
