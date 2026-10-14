import { prisma } from '../prisma';
import { maskEmail } from '../masking';
import { ParsedEmailMessage, SpamAnalysisResult, EmailDraftResponse } from './types';
import { analyzeEmailThreat } from './spamFilter';
import { generateEmailReplyDraft } from '../engine/guestJourney';

export interface EmailDispatchResult {
  success: boolean;
  customerId?: string;
  conversationId?: string;
  threatResult: SpamAnalysisResult;
  draft?: EmailDraftResponse;
  autoReplied: boolean;
  quarantined: boolean;
  reason?: string;
}

/**
 * Dispatches an inbound email into the Hotel Sherpa Soul CRM & Guest Journey pipeline.
 *
 * Strictly adheres to:
 * - Safety Rule 5: Never auto-reply to phishing, spam, or unknown senders.
 * - Safety Rule 10: Default email auto-reply = OFF; human-in-the-loop first.
 * - Safety Rule 11 & 12: All guest PII in logs masked (maskEmail).
 */
export async function processInboundEmail(email: ParsedEmailMessage): Promise<EmailDispatchResult> {
  const maskedSender = maskEmail(email.fromEmail);
  console.log(`[EMAIL DISPATCHER] Processing inbound email from ${maskedSender} - Subject: "${email.subject.slice(0, 40)}"`);

  // 1. Phishing & Spam Analysis Pipeline
  const threatResult = analyzeEmailThreat(email);

  if (threatResult.isSpamOrPhishing) {
    console.warn(`[SECURITY ALERT] Email from ${maskedSender} flagged as ${threatResult.threatLevel} (Threat Score: ${threatResult.score}/100)`);
    console.warn(`[SECURITY ALERT] Signals: ${threatResult.factors.map(f => f.signal).join(', ')}`);

    // Create or find customer to record threat event in CRM
    let customer = await prisma.customer.findFirst({
      where: { email: email.fromEmail },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: email.fromName || 'Suspicious Sender',
          email: email.fromEmail,
          firstChannel: 'EMAIL',
          notes: `[SECURITY] Flagged as ${threatResult.threatLevel} (Score: ${threatResult.score}) on ${new Date().toISOString()}`,
        },
      });
    }

    // Create conversation quarantined in HUMAN mode
    const conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        channel: 'EMAIL',
        externalThreadId: email.messageId,
        status: 'HUMAN_REQUIRED',
        mode: 'HUMAN', // Bot reply strictly suppressed
        unreadStaff: true,
        summary: `🚨 [SPAM/PHISHING ALERT] Score: ${threatResult.score}/100. Signals: ${threatResult.factors.map(f => f.signal).join(', ')}`,
        notes: threatResult.summary,
      },
    });

    // Save message with FLAGGED status
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        customerId: customer.id,
        channel: 'EMAIL',
        direction: 'INBOUND',
        messageType: 'TEXT',
        content: `[FLAGGED ${threatResult.threatLevel} - THREAT SCORE ${threatResult.score}]\nSubject: ${email.subject}\n\n${email.textBody}`,
        externalMessageId: email.messageId,
        status: 'FAILED',
        rawPayload: JSON.stringify({
          threatResult,
          headers: email.headers,
          attachmentsCount: email.attachments.length,
        }),
      },
    });

    return {
      success: true,
      customerId: customer.id,
      conversationId: conversation.id,
      threatResult,
      autoReplied: false,
      quarantined: true,
      reason: `Quarantined due to threat level ${threatResult.threatLevel} (Score: ${threatResult.score})`,
    };
  }

  // 2. Safe Email - Resolve Customer & Threading
  let customer = await prisma.customer.findFirst({
    where: { email: email.fromEmail },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: email.fromName || 'Email Guest',
        email: email.fromEmail,
        firstChannel: 'EMAIL',
      },
    });
  } else if (email.fromName && customer.name === 'Email Guest') {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: email.fromName },
    });
  }

  // 3. Thread lookup or creation
  let conversation = await prisma.conversation.findFirst({
    where: {
      customerId: customer.id,
      channel: 'EMAIL',
      status: { not: 'CLOSED' },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        channel: 'EMAIL',
        externalThreadId: email.messageId,
        status: 'OPEN',
        mode: 'HUMAN', // Safety Rule 10: Human-in-the-loop first
        summary: `Inquiry from ${maskedSender}: ${email.subject}`,
      },
    });
  }

  // 4. Save Inbound Message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      customerId: customer.id,
      channel: 'EMAIL',
      direction: 'INBOUND',
      messageType: 'TEXT',
      content: `Subject: ${email.subject}\n\n${email.textBody}`,
      externalMessageId: email.messageId,
      status: 'READ',
      rawPayload: JSON.stringify({
        subject: email.subject,
        attachments: email.attachments.map(a => ({ filename: a.filename, size: a.size, type: a.contentType })),
        authResults: email.authResults,
      }),
    },
  });

  // 5. Generate Grounded Draft Response (Strict KB, human contact included, no hallucination)
  const draft = await generateEmailReplyDraft(email, customer.id);

  // 6. Update Lead in CRM with channel EMAIL
  const existingLead = await prisma.lead.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
  });

  const leadData = {
    name: email.fromName || customer.name || 'Email Guest',
    email: email.fromEmail,
    channel: 'EMAIL',
    source: 'Official Email (info@hotelsherpasoul.com)',
    leadStatus: 'CONTACTED',
    conversationStatus: 'HUMAN_REQUIRED',
    scoreReason: `Inbound email inquiry (${email.subject}) - Drafted reply waiting for staff review`,
    lastContactAt: new Date(),
  };

  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: leadData,
    });
  } else {
    await prisma.lead.create({
      data: {
        customerId: customer.id,
        ...leadData,
      },
    });
  }

  // 7. Update Conversation with Draft & Staff Review flag
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: 'HUMAN_REQUIRED',
      mode: 'HUMAN', // Rule 10: Default email auto-reply = OFF; human-in-the-loop first
      unreadStaff: true,
      lastMessageAt: new Date(),
      summary: `[DRAFT READY FOR REVIEW] Subject: ${email.subject}`,
      notes: `Proposed Draft:\n${draft.text.slice(0, 300)}...`,
    },
  });

  console.log(`[EMAIL DISPATCHER] Successfully queued email thread for ${maskedSender} with prepared draft.`);

  return {
    success: true,
    customerId: customer.id,
    conversationId: conversation.id,
    threatResult,
    draft,
    autoReplied: false, // Default is strictly OFF
    quarantined: false,
  };
}
