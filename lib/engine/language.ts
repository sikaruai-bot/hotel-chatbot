// lib/engine/language.ts
import { detectLanguage } from './intentDetector';
import { isMultilingualEnabled } from './featureFlags';

const SHORT_AMBIGUOUS_TOKENS = new Set([
  'ok',
  'okay',
  'yes',
  'no',
  'sure',
  'yep',
  'yeah',
  'k',
  'thx',
  'thanks',
  'fine',
  'good',
  'great',
  'alright',
  'hello',
  'hi',
  'hey',
]);

/**
 * Detects the dominant language of a message.
 * - Gated behind ENABLE_MULTILINGUAL (returns 'en' or default if disabled).
 * - Per-message detection for every incoming message.
 * - Resolves short/ambiguous input ("ok", "yes", <= 3 chars) using conversation context (previousLang).
 * - If still unclear without context, defaults to 'en'.
 */
export async function getMessageLanguage(
  text: string,
  previousLang?: string
): Promise<string> {
  if (!isMultilingualEnabled()) {
    return 'en';
  }

  if (!text || typeof text !== 'string') {
    return previousLang || 'en';
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // If input is very short (<= 3 chars) or an ambiguous conversational token
  if (trimmed.length <= 3 || SHORT_AMBIGUOUS_TOKENS.has(lower)) {
    if (previousLang && previousLang !== 'en') {
      return previousLang;
    }
  }

  return detectLanguage(trimmed);
}

/**
 * Utility for edge-case translation and output formatting.
 */
export function translateIfNeeded(text: string, targetLang: string): string {
  // If target is English or text already matches target language, return as-is
  if (!targetLang || targetLang === 'en') {
    return text;
  }
  return text;
}
