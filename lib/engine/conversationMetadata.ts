// lib/engine/conversationMetadata.ts
/**
 * In-memory conversation metadata tracker.
 * Stores per-message detected language, switch history, and runtime channel metadata
 * without requiring database schema changes or migrations.
 */

export interface MessageLanguageRecord {
  timestamp: Date;
  messageId?: string;
  language: string;
  contentSnippet?: string;
}

export interface InMemoryConversationMeta {
  conversationId: string;
  currentLanguage: string;
  previousLanguage?: string;
  history: MessageLanguageRecord[];
  lastUpdated: Date;
}

const metadataStore = new Map<string, InMemoryConversationMeta>();

/**
 * Record a detected language for a conversation message.
 */
export function recordMessageLanguage(
  conversationId: string,
  language: string,
  messageId?: string,
  contentSnippet?: string
): InMemoryConversationMeta {
  const existing = metadataStore.get(conversationId);
  const now = new Date();

  if (existing) {
    const prev = existing.currentLanguage;
    existing.previousLanguage = prev;
    existing.currentLanguage = language;
    existing.lastUpdated = now;
    existing.history.push({
      timestamp: now,
      messageId,
      language,
      contentSnippet: contentSnippet ? contentSnippet.slice(0, 50) : undefined,
    });
    return existing;
  }

  const created: InMemoryConversationMeta = {
    conversationId,
    currentLanguage: language,
    history: [
      {
        timestamp: now,
        messageId,
        language,
        contentSnippet: contentSnippet ? contentSnippet.slice(0, 50) : undefined,
      },
    ],
    lastUpdated: now,
  };

  metadataStore.set(conversationId, created);
  return created;
}

/**
 * Retrieve current conversation language from in-memory metadata.
 */
export function getConversationCurrentLanguage(conversationId: string): string | undefined {
  return metadataStore.get(conversationId)?.currentLanguage;
}

/**
 * Retrieve previous conversation language (for detecting mid-conversation switches or short ambiguous replies).
 */
export function getConversationPreviousLanguage(conversationId: string): string | undefined {
  return metadataStore.get(conversationId)?.previousLanguage;
}

/**
 * Retrieve entire metadata record.
 */
export function getConversationMetadata(conversationId: string): InMemoryConversationMeta | undefined {
  return metadataStore.get(conversationId);
}

/**
 * Reset metadata (useful for tests or closed sessions).
 */
export function clearConversationMetadata(conversationId?: string): void {
  if (conversationId) {
    metadataStore.delete(conversationId);
  } else {
    metadataStore.clear();
  }
}
