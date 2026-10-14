/**
 * Official Email & Spam Protection Types
 * Hotel Sherpa Soul (info@hotelsherpasoul.com)
 */

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number; // bytes
  content?: string; // base64 or download url
}

export interface EmailAuthResults {
  spf?: 'pass' | 'neutral' | 'softfail' | 'fail' | 'none';
  dkim?: 'pass' | 'fail' | 'none';
  dmarc?: 'pass' | 'fail' | 'none';
  aligned?: boolean;
  rawAuthenticationResults?: string;
}

export interface ParsedEmailMessage {
  messageId: string;
  fromEmail: string;
  fromName?: string;
  to: string[];
  replyTo?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  headers: Record<string, string>;
  attachments: EmailAttachment[];
  authResults: EmailAuthResults;
  receivedAt: Date;
}

export type ThreatLevel = 'SAFE' | 'SUSPICIOUS' | 'PHISHING_SPAM';

export interface ThreatFactor {
  signal: string;
  weight: number;
  description: string;
}

export interface SpamAnalysisResult {
  score: number; // 0 (clean) to 100 (critical threat)
  threatLevel: ThreatLevel;
  isSpamOrPhishing: boolean;
  autoReplyAllowed: boolean;
  factors: ThreatFactor[];
  summary: string;
}

export interface EmailDraftResponse {
  to: string;
  subject: string;
  text: string;
  html: string;
  isDraftOnly: boolean;
  requiresStaffApproval: boolean;
  groundedKnowledge: string[];
  humanContactIncluded: boolean;
}
