/**
 * PII Masking Utilities
 * Protects guest phone numbers, tokens, and sensitive data from plain-text exposure in logs.
 */

/**
 * Masks a phone number for safe logging.
 * Retains country/area prefix and last 3 digits, masking the middle.
 * Examples:
 *   "+9779818259472" -> "+97798****472"
 *   "9818259472"     -> "981****472"
 *   "9818"           -> "****"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '***';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';

  const prefixLen = clean.startsWith('+') ? Math.min(5, clean.length - 4) : Math.min(3, clean.length - 4);
  const suffixLen = Math.min(3, clean.length - prefixLen);

  const prefix = clean.slice(0, prefixLen);
  const suffix = clean.slice(-suffixLen);

  return `${prefix}****${suffix}`;
}

/**
 * Masks a token or secret for logging.
 * Returns only the first 4 characters followed by asterisks.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || typeof secret !== 'string') return '***';
  if (secret.length <= 6) return '******';
  return `${secret.slice(0, 4)}...[REDACTED ${secret.length} chars]`;
}
