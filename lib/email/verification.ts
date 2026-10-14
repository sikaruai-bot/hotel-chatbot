import crypto from 'crypto';
import { maskSecret } from '../masking';

export interface VerifyWebhookOptions {
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
  secret?: string;
  toleranceSeconds?: number;
}

export interface VerificationResult {
  isValid: boolean;
  reason?: string;
  timestamp?: number;
  messageId?: string;
}

/**
 * Normalizes headers from NextRequest Headers or plain object.
 */
function getHeader(
  headers: Headers | Record<string, string | null | undefined>,
  name: string
): string | null {
  const lowerName = name.toLowerCase();
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(lowerName);
  }
  const obj = headers as Record<string, string | null | undefined>;
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === lowerName) {
      return obj[key] || null;
    }
  }
  return null;
}

/**
 * Verifies inbound email webhook signature.
 * Supports:
 *  1. Svix Standard Webhooks (Resend inbound standard: svix-id, svix-timestamp, svix-signature)
 *  2. Standard HMAC-SHA256 (x-signature-sha256, x-resend-signature)
 */
export function verifyEmailWebhookSignature(options: VerifyWebhookOptions): VerificationResult {
  const { rawBody, headers, toleranceSeconds = 300 } = options;
  const secret = options.secret || process.env.RESEND_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET;

  if (!secret) {
    return {
      isValid: false,
      reason: 'Missing webhook signing secret configuration in environment',
    };
  }

  // 1. Check for Svix headers (Resend standard)
  const svixId = getHeader(headers, 'svix-id');
  const svixTimestamp = getHeader(headers, 'svix-timestamp');
  const svixSignature = getHeader(headers, 'svix-signature');

  if (svixId && svixTimestamp && svixSignature) {
    // Timestamp freshness validation
    const tsNumber = parseInt(svixTimestamp, 10);
    if (isNaN(tsNumber)) {
      return { isValid: false, reason: 'Invalid svix-timestamp header' };
    }

    const currentTs = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTs - tsNumber) > toleranceSeconds) {
      return { isValid: false, reason: 'Webhook timestamp outside allowed tolerance window' };
    }

    // Svix secret key may be prefixed with 'whsec_'
    let keyBytes: Buffer;
    if (secret.startsWith('whsec_')) {
      const b64Secret = secret.slice(6);
      keyBytes = Buffer.from(b64Secret, 'base64');
    } else {
      keyBytes = Buffer.from(secret, 'utf-8');
    }

    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', keyBytes);
    hmac.update(toSign);
    const expectedBase64 = hmac.digest('base64');

    // svix-signature can contain multiple space-separated signatures (e.g. "v1,g0hM6... v1,...")
    const signatures = svixSignature.split(' ');
    let matched = false;

    for (const versionedSig of signatures) {
      const [version, sig] = versionedSig.split(',');
      if (version === 'v1' && sig) {
        try {
          const sigBuf = Buffer.from(sig, 'base64');
          const expBuf = Buffer.from(expectedBase64, 'base64');
          if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
            matched = true;
            break;
          }
        } catch {
          // ignore malformed signature parts
        }
      }
    }

    if (matched) {
      return { isValid: true, timestamp: tsNumber, messageId: svixId };
    }

    return { isValid: false, reason: 'Invalid svix-signature hash mismatch' };
  }

  // 2. Check for Standard HMAC-SHA256 signature
  const hmacHeader =
    getHeader(headers, 'x-signature-sha256') ||
    getHeader(headers, 'x-resend-signature') ||
    getHeader(headers, 'x-hub-signature-256');

  if (hmacHeader) {
    const cleanSig = hmacHeader.startsWith('sha256=') ? hmacHeader.slice(7) : hmacHeader;
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const cleanSigBuf = Buffer.from(cleanSig, 'hex');
    const compBuf = Buffer.from(computed, 'hex');

    if (cleanSigBuf.length === compBuf.length && crypto.timingSafeEqual(cleanSigBuf, compBuf)) {
      return { isValid: true };
    }

    return { isValid: false, reason: 'Invalid HMAC-SHA256 signature mismatch' };
  }

  return {
    isValid: false,
    reason: 'Missing required webhook signature headers (svix-signature or x-signature-sha256)',
  };
}

/**
 * Helper to generate Svix signature for automated tests.
 */
export function generateTestSvixSignature(
  rawBody: string,
  secret: string,
  timestamp?: number,
  msgId?: string
): { 'svix-id': string; 'svix-timestamp': string; 'svix-signature': string } {
  const svixId = msgId || `msg_${crypto.randomBytes(12).toString('hex')}`;
  const svixTimestamp = String(timestamp || Math.floor(Date.now() / 1000));

  let keyBytes: Buffer;
  if (secret.startsWith('whsec_')) {
    keyBytes = Buffer.from(secret.slice(6), 'base64');
  } else {
    keyBytes = Buffer.from(secret, 'utf-8');
  }

  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sig = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

  return {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': `v1,${sig}`,
  };
}
