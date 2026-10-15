// lib/engine/featureFlags.ts
/**
 * Feature flags for the hotel-chatbot application.
 * All flags default to the safe value (disabled) and can be toggled
 * via environment variables or test setups without modifying production configurations.
 */

export function isMultilingualEnabled(): boolean {
  return process.env.ENABLE_MULTILINGUAL === 'true';
}

export const ENABLE_MULTILINGUAL = process.env.ENABLE_MULTILINGUAL === 'true' || false;
