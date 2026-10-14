import {
  ParsedEmailMessage,
  SpamAnalysisResult,
  ThreatFactor,
  ThreatLevel,
} from './types';

/**
 * High-risk executable and script file extensions
 */
const HIGH_RISK_EXTENSIONS = new Set([
  'exe', 'scr', 'bat', 'cmd', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh',
  'ps1', 'ps1xml', 'ps2', 'psc1', 'msc', 'msi', 'msp', 'jar', 'hta', 'cpl', 'inf', 'reg'
]);

/**
 * Macro-enabled document extensions
 */
const MACRO_EXTENSIONS = new Set([
  'docm', 'dotm', 'xlsm', 'xltm', 'xlam', 'pptm', 'potm', 'ppam', 'ppsm', 'sldm'
]);

/**
 * Archive extensions often used to bundle payloads
 */
const ARCHIVE_EXTENSIONS = new Set([
  'zip', 'rar', '7z', 'iso', 'tar', 'gz', 'bz2', 'xz', 'cab'
]);

/**
 * Common URL shorteners commonly exploited in phishing campaigns
 */
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'cutt.ly', 'rb.gy', 'shorte.st', 'adf.ly', 'bc.vc', 'rebrand.ly'
]);

/**
 * Financial lures and credential harvesting triggers
 */
const WIRE_AND_FRAUD_PATTERNS = [
  { pattern: /\b(wire transfer|western union|moneygram|swift code|bank routing)\b/i, weight: 35, description: 'Wire transfer or direct routing instruction' },
  { pattern: /\b(crypto|bitcoin|btc|eth|usdt|binance|wallet address)\b/i, weight: 30, description: 'Cryptocurrency payment lure' },
  { pattern: /\b(inheritance|next of kin|unclaimed fund|lottery|compensation fund)\b/i, weight: 45, description: 'Advance fee fraud / inheritance lure' },
  { pattern: /\b(account suspended|verify your password|login immediately|security alert: verify|credentials expired)\b/i, weight: 40, description: 'Credential harvesting / account suspension lure' },
  { pattern: /\b(urgent overdue invoice|payment receipt attached|past due invoice|wire funds now)\b/i, weight: 30, description: 'Urgent invoice or payment lure' },
];

/**
 * Hotel official domain names to detect lookalike / typosquatting domains
 */
const OFFICIAL_DOMAIN = 'hotelsherpasoul.com';
const LOOKALIKE_PATTERNS = [
  /hotelsherpasou1\.com/i,
  /hotelsherpa-soul\.com/i,
  /hotel-sherpasoul\.com/i,
  /sherpasoul-hotel\.com/i,
  /hotelsherpasoul\.(net|org|xyz|info|top|cc|biz|ru)/i,
];

/**
 * Extracts all URLs from HTML and plain text bodies.
 */
export function extractUrls(text: string, html?: string): string[] {
  const urls: string[] = [];
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;

  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  if (html) {
    const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    while ((match = hrefRegex.exec(html)) !== null) {
      if (!urls.includes(match[1])) {
        urls.push(match[1]);
      }
    }
  }

  return urls;
}

/**
 * Inspects HTML for misleading anchor text (e.g. Anchor says google.com but href goes elsewhere).
 */
export function detectDeceptiveAnchors(html?: string): boolean {
  if (!html) return false;
  const anchorTagRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorTagRegex.exec(html)) !== null) {
    const href = match[1].toLowerCase();
    const anchorText = match[2].trim().toLowerCase();

    // Check if anchor text looks like a URL
    if (anchorText.startsWith('http://') || anchorText.startsWith('https://') || anchorText.startsWith('www.')) {
      try {
        const hrefHost = new URL(href).hostname.toLowerCase();
        const textClean = anchorText.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        if (textClean && !hrefHost.includes(textClean) && !textClean.includes(hrefHost)) {
          return true; // Anchor text shows a different domain than target href!
        }
      } catch {
        // ignore malformed URLs
      }
    }
  }
  return false;
}

/**
 * Evaluates an inbound email against multiple phishing and spam vectors.
 * Returns a 0-100 threat score, threat level, and itemized factors.
 */
export function analyzeEmailThreat(email: ParsedEmailMessage): SpamAnalysisResult {
  const factors: ThreatFactor[] = [];
  let score = 0;

  const senderEmail = email.fromEmail.toLowerCase();
  const senderDomain = senderEmail.split('@')[1] || '';
  const combinedContent = `${email.subject}\n${email.textBody}\n${email.htmlBody || ''}`;

  // 1. Domain Spoofing & Lookalikes
  for (const pattern of LOOKALIKE_PATTERNS) {
    if (pattern.test(senderDomain)) {
      factors.push({
        signal: 'LOOKALIKE_DOMAIN_SPOOF',
        weight: 60,
        description: `Sender domain "${senderDomain}" matches a known lookalike/spoofed variant of ${OFFICIAL_DOMAIN}`,
      });
      score += 60;
      break;
    }
  }

  // Check if sender attempts to display as official hotel but comes from non-official domain
  if (
    (email.fromName?.toLowerCase().includes('hotel sherpa soul') || email.subject.toLowerCase().includes('sherpa soul admin')) &&
    senderDomain !== OFFICIAL_DOMAIN
  ) {
    factors.push({
      signal: 'BRAND_IMPERSONATION',
      weight: 50,
      description: `Sender displays hotel branding but uses external domain "${senderDomain}"`,
    });
    score += 50;
  }

  // 2. Email Authentication Signals (SPF, DKIM, DMARC)
  const auth = email.authResults;

  if (auth.spf === 'fail') {
    factors.push({ signal: 'SPF_FAIL', weight: 45, description: 'SPF authentication failed' });
    score += 45;
  } else if (auth.spf === 'softfail') {
    factors.push({ signal: 'SPF_SOFTFAIL', weight: 25, description: 'SPF softfailed (~all)' });
    score += 25;
  } else if (auth.spf === 'none' || !auth.spf) {
    factors.push({ signal: 'SPF_NONE', weight: 15, description: 'No SPF record found for sender domain' });
    score += 15;
  }

  if (auth.dkim === 'fail') {
    factors.push({ signal: 'DKIM_FAIL', weight: 45, description: 'DKIM cryptographic signature verification failed' });
    score += 45;
  } else if (auth.dkim === 'none' || !auth.dkim) {
    factors.push({ signal: 'DKIM_NONE', weight: 15, description: 'Email lacks DKIM cryptographic signature' });
    score += 15;
  }

  if (auth.dmarc === 'fail') {
    factors.push({ signal: 'DMARC_FAIL', weight: 45, description: 'DMARC policy alignment failed' });
    score += 45;
  }

  // 3. Attachments Analysis
  for (const attachment of email.attachments) {
    const ext = (attachment.filename.split('.').pop() || '').toLowerCase();

    if (HIGH_RISK_EXTENSIONS.has(ext)) {
      factors.push({
        signal: 'HIGH_RISK_ATTACHMENT',
        weight: 70,
        description: `High-risk executable/script attachment detected: ${attachment.filename}`,
      });
      score += 70;
    } else if (MACRO_EXTENSIONS.has(ext)) {
      factors.push({
        signal: 'MACRO_DOCUMENT_ATTACHMENT',
        weight: 50,
        description: `Macro-enabled document attachment detected: ${attachment.filename}`,
      });
      score += 50;
    } else if (ARCHIVE_EXTENSIONS.has(ext)) {
      factors.push({
        signal: 'ARCHIVE_ATTACHMENT',
        weight: 30,
        description: `Compressed archive attachment detected: ${attachment.filename}`,
      });
      score += 30;
    }
  }

  // 4. Suspicious Links & Shorteners
  const urls = extractUrls(email.textBody, email.htmlBody);
  let shortenerCount = 0;
  let rawIpCount = 0;

  for (const urlStr of urls) {
    try {
      const parsedUrl = new URL(urlStr);
      const host = parsedUrl.hostname.toLowerCase();

      if (URL_SHORTENERS.has(host)) {
        shortenerCount++;
      }

      // Check for raw IP address as hostname (e.g. http://192.168.1.1/invoice.pdf)
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        rawIpCount++;
      }
    } catch {
      // ignore invalid URLs
    }
  }

  if (shortenerCount > 0) {
    const weight = Math.min(50, shortenerCount * 25);
    factors.push({
      signal: 'URL_SHORTENER_DETECTED',
      weight,
      description: `${shortenerCount} shortened URL(s) detected (e.g., masking real destination)`,
    });
    score += weight;
  }

  if (rawIpCount > 0) {
    factors.push({
      signal: 'RAW_IP_URL_DETECTED',
      weight: 40,
      description: `${rawIpCount} link(s) point directly to raw IP addresses instead of trusted domain names`,
    });
    score += 40;
  }

  if (detectDeceptiveAnchors(email.htmlBody)) {
    factors.push({
      signal: 'DECEPTIVE_ANCHOR_TEXT',
      weight: 45,
      description: 'Deceptive link detected where displayed link text differs from actual destination URL',
    });
    score += 45;
  }

  // 5. Wire Fraud, Advance Fee, & Credential Harvesting Lures
  for (const lure of WIRE_AND_FRAUD_PATTERNS) {
    if (lure.pattern.test(combinedContent)) {
      factors.push({
        signal: 'FINANCIAL_FRAUD_LURE',
        weight: lure.weight,
        description: lure.description,
      });
      score += lure.weight;
    }
  }

  // Cap score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Determine threat level
  let threatLevel: ThreatLevel = 'SAFE';
  if (normalizedScore >= 50) {
    threatLevel = 'PHISHING_SPAM';
  } else if (normalizedScore >= 30) {
    threatLevel = 'SUSPICIOUS';
  }

  const isSpamOrPhishing = threatLevel === 'PHISHING_SPAM' || threatLevel === 'SUSPICIOUS';

  // Strict Rule: Never auto-reply to phishing, spam, or unknown senders
  // Auto-reply is strictly disallowed if threat score >= 20 or if authentication is unverified
  const autoReplyAllowed =
    threatLevel === 'SAFE' &&
    normalizedScore < 20 &&
    auth.spf === 'pass' &&
    auth.dkim === 'pass';

  let summary = `Score: ${normalizedScore}/100 [${threatLevel}]`;
  if (factors.length > 0) {
    summary += ` | Signals: ${factors.map((f) => f.signal).join(', ')}`;
  } else {
    summary += ' | Clean inquiry with verified authentication';
  }

  return {
    score: normalizedScore,
    threatLevel,
    isSpamOrPhishing,
    autoReplyAllowed,
    factors,
    summary,
  };
}
