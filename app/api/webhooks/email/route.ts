import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailWebhookSignature } from '@/lib/email/verification';
import { processInboundEmail } from '@/lib/email/emailDispatcher';
import { ParsedEmailMessage, EmailAuthResults, EmailAttachment } from '@/lib/email/types';
import { maskEmail } from '@/lib/masking';

/**
 * Extracts email address and display name from an RFC 5322 string.
 * e.g. "John Doe <john@example.com>" -> { email: "john@example.com", name: "John Doe" }
 */
function parseFromHeader(fromStr?: string): { email: string; name?: string } {
  if (!fromStr) return { email: 'unknown@example.com' };

  const match = fromStr.match(/^(?:["']?([^"']*)["']?\s+)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (match) {
    const name = match[1]?.trim() || undefined;
    const email = match[2]?.trim().toLowerCase() || fromStr.trim().toLowerCase();
    return { email, name };
  }

  return { email: fromStr.trim().toLowerCase() };
}

/**
 * Parses authentication results header for SPF, DKIM, DMARC statuses.
 */
function parseAuthResults(headers: Record<string, string>): EmailAuthResults {
  const authHeader = (
    headers['authentication-results'] ||
    headers['arc-authentication-results'] ||
    ''
  ).toLowerCase();

  const results: EmailAuthResults = {
    rawAuthenticationResults: authHeader || undefined,
  };

  // SPF
  if (authHeader.includes('spf=pass')) {
    results.spf = 'pass';
  } else if (authHeader.includes('spf=fail')) {
    results.spf = 'fail';
  } else if (authHeader.includes('spf=softfail')) {
    results.spf = 'softfail';
  } else if (authHeader.includes('spf=none')) {
    results.spf = 'none';
  }

  // DKIM
  if (authHeader.includes('dkim=pass')) {
    results.dkim = 'pass';
  } else if (authHeader.includes('dkim=fail')) {
    results.dkim = 'fail';
  } else if (authHeader.includes('dkim=none')) {
    results.dkim = 'none';
  }

  // DMARC
  if (authHeader.includes('dmarc=pass')) {
    results.dmarc = 'pass';
  } else if (authHeader.includes('dmarc=fail')) {
    results.dmarc = 'fail';
  } else if (authHeader.includes('dmarc=none')) {
    results.dmarc = 'none';
  }

  results.aligned = results.spf === 'pass' && results.dkim === 'pass';
  return results;
}

/**
 * POST /api/webhooks/email
 * Receives transactional email inbound webhooks (e.g. Resend `email.received`).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Verify Webhook Signature (Svix or HMAC-SHA256)
    const verification = verifyEmailWebhookSignature({
      rawBody,
      headers: req.headers,
    });

    if (!verification.isValid) {
      console.warn(`[EMAIL WEBHOOK REJECTED] ${verification.reason || 'Invalid signature'}`);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing webhook signature', detail: verification.reason },
        { status: 401 }
      );
    }

    // 2. Parse payload safely
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // Handle standard Resend webhook format or direct email payload
    const eventType = payload.type;
    const emailData = eventType === 'email.received' ? payload.data : payload;

    if (!emailData) {
      return NextResponse.json({ error: 'Missing email data object' }, { status: 400 });
    }

    // Extract headers
    const headers: Record<string, string> = {};
    if (emailData.headers && typeof emailData.headers === 'object') {
      for (const [k, v] of Object.entries(emailData.headers)) {
        if (typeof v === 'string') headers[k.toLowerCase()] = v;
      }
    }

    // Extract sender
    const rawFrom = emailData.from || headers['from'] || '';
    const { email: fromEmail, name: fromName } = parseFromHeader(rawFrom);

    if (!fromEmail || !fromEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid or missing sender email address' }, { status: 400 });
    }

    // Extract recipients
    let toList: string[] = [];
    if (Array.isArray(emailData.to)) {
      toList = emailData.to;
    } else if (typeof emailData.to === 'string') {
      toList = [emailData.to];
    }

    // Extract subject and bodies
    const subject = emailData.subject || headers['subject'] || '(No Subject)';
    const textBody = emailData.text || emailData.body || '';
    const htmlBody = emailData.html || undefined;

    // Extract attachments safely
    const attachments: EmailAttachment[] = [];
    if (Array.isArray(emailData.attachments)) {
      for (const att of emailData.attachments) {
        if (att && typeof att === 'object') {
          attachments.push({
            filename: String(att.filename || 'attachment'),
            contentType: String(att.content_type || att.contentType || 'application/octet-stream'),
            size: Number(att.size || 0),
          });
        }
      }
    }

    // Extract authentication results
    const authResults = parseAuthResults(headers);

    // If explicit auth fields provided directly on emailData
    if (emailData.spf) authResults.spf = emailData.spf;
    if (emailData.dkim) authResults.dkim = emailData.dkim;
    if (emailData.dmarc) authResults.dmarc = emailData.dmarc;

    const parsedEmail: ParsedEmailMessage = {
      messageId: emailData.email_id || headers['message-id'] || `em_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fromEmail,
      fromName,
      to: toList,
      replyTo: emailData.reply_to || headers['reply-to'] || undefined,
      subject,
      textBody,
      htmlBody,
      headers,
      attachments,
      authResults,
      receivedAt: new Date(),
    };

    // 3. Dispatch into CRM & Spam Protection Pipeline
    const result = await processInboundEmail(parsedEmail);

    return NextResponse.json({
      success: true,
      messageId: parsedEmail.messageId,
      customerId: result.customerId,
      conversationId: result.conversationId,
      quarantined: result.quarantined,
      threatScore: result.threatResult.score,
      threatLevel: result.threatResult.threatLevel,
    });
  } catch (error: any) {
    console.error('[EMAIL WEBHOOK ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error processing email webhook' },
      { status: 500 }
    );
  }
}
