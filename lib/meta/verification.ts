import crypto from 'crypto';

export function verifyWebhookChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { isValid: boolean; challenge?: string } {
  const expectedToken = process.env.META_VERIFY_TOKEN || 'sherpa_soul_webhook_verify_token_2026';
  if (mode === 'subscribe' && token === expectedToken && challenge) {
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

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
