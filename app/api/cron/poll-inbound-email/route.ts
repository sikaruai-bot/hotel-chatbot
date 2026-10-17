import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/meta/whatsapp";
import { maskEmail, maskPhoneNumber } from "@/lib/masking";

export const dynamic = "force-dynamic";

// Vercel Serverless Function Maximum Duration:
// On Vercel Hobby plan, Serverless Functions support up to 60 seconds.
// We set a conservative 30-second ceiling to guarantee termination within budget.
export const maxDuration = 30;

// Strict Guardrail: Inbound email auto-reply is permanently disabled
const ENABLE_EMAIL_AUTO_REPLY = false;

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get("authorization") || "";
  const expectedAuth = `Bearer ${cronSecret}`;

  if (authHeader.length === 0 || authHeader.length !== expectedAuth.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(authHeader, "utf8"),
    Buffer.from(expectedAuth, "utf8")
  );
}

function extractPhoneNumber(text: string): string | null {
  if (!text) return null;
  const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g;
  const matches = text.match(phoneRegex);
  if (!matches) return null;

  for (const match of matches) {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) {
      return match.trim();
    }
  }
  return null;
}

function isIgnoredSender(fromAddress: string, headers: Map<string, any>): boolean {
  const lowerFrom = (fromAddress || "").toLowerCase();

  // 1. Ignore internal domain addresses to prevent processing loops
  if (lowerFrom.endsWith("@hotelsherpasoul.com")) {
    return true;
  }

  // 2. Ignore automated / bulk / autoreply headers
  const autoSubmitted = String(headers.get("auto-submitted") || "").toLowerCase();
  const precedence = String(headers.get("precedence") || "").toLowerCase();
  const xAutoreply = String(headers.get("x-autoreply") || "").toLowerCase();

  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (["bulk", "junk", "list"].includes(precedence)) return true;
  if (xAutoreply === "yes") return true;

  return false;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Timing-safe CRON_SECRET verification
  if (!verifyCronSecret(req)) {
    console.warn("[IMAP INGESTION] Unauthorized polling attempt rejected.");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const summary = {
    processed: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "mail.hotelsherpasoul.com",
    port: Number(process.env.IMAP_PORT) || 993,
    secure: process.env.IMAP_SECURE !== "false",
    auth: {
      user: process.env.IMAP_USER || "chatbot@hotelsherpasoul.com",
      pass: process.env.IMAP_PASS || "",
    },
    logger: false,
    emitLogs: false,
  });

  try {
    // 2. 10-second connection timeout guarantee
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("IMAP connection timed out after 10000ms")), 10000)
      ),
    ]);

    const lock = await client.getMailboxLock("INBOX");
    try {
      // 3. Fetch only UNSEEN messages
      const messages = client.fetch(
        { seen: false },
        { envelope: true, source: true, uid: true }
      );

      let batchCount = 0;
      for await (const msg of messages) {
        // 4. Strict batch size cap: maximum 10 per execution
        if (batchCount >= 10) {
          console.log("[IMAP INGESTION] Batch limit of 10 reached; remaining unread messages will be processed in next cycle.");
          break;
        }
        batchCount++;

        try {
          if (!msg.source) {
            console.warn(`[IMAP INGESTION] Message UID ${msg.uid} has no body source buffer. Skipping.`);
            summary.skipped++;
            continue;
          }

          const parsed = await simpleParser(msg.source);
          const rawMessageId = parsed.messageId || msg.envelope?.messageId || `<uid-${msg.uid}@hotelsherpasoul.com>`;
          const messageId = String(rawMessageId).trim();

          // 5. Deduplication by RFC 2822 Message-ID
          const existing = await prisma.inboundEmailLog.findUnique({
            where: { messageId },
          });

          if (existing) {
            console.log(`[IMAP INGESTION] Duplicate Message-ID ${messageId} already processed. Marking UID ${msg.uid} as Seen.`);
            // imapflow API verified: messageFlagsAdd(range, flags, { uid: true })
            const markSeen = await client.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            console.log(`[IMAP INGESTION] Duplicate UID ${msg.uid} flag update to \\Seen: ${markSeen}`);
            summary.skipped++;
            continue;
          }

          const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || "";
          const fromName = parsed.from?.value?.[0]?.name || fromAddress;
          const subject = parsed.subject || "(No Subject)";
          const textBody = parsed.text || "";
          const receivedDate = parsed.date || new Date();

          // 6. Ignore internal senders and automated loops
          if (isIgnoredSender(fromAddress, parsed.headers)) {
            console.log(`[IMAP INGESTION] Filtered internal or automated message from ${maskEmail(fromAddress)}. Skipping.`);
            await prisma.inboundEmailLog.create({
              data: {
                messageId,
                senderEmail: fromAddress,
                senderName: fromName,
                subject,
                snippet: textBody.slice(0, 300),
                status: "SKIPPED_LOOP",
                receivedAt: receivedDate,
              },
            });
            const markSeen = await client.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            console.log(`[IMAP INGESTION] Filtered UID ${msg.uid} flag update to \\Seen: ${markSeen}`);
            summary.skipped++;
            continue;
          }

          // 7. Extract phone number from plain text body
          const senderPhone = extractPhoneNumber(textBody);

          // 8. Find or create Customer
          let customer = await prisma.customer.findFirst({
            where: { email: fromAddress },
          });

          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                name: fromName !== fromAddress ? fromName : "Email Guest",
                email: fromAddress,
                phone: senderPhone || undefined,
                firstChannel: "EMAIL",
              },
            });
          } else if (senderPhone && !customer.phone) {
            // Safely handle unique constraint collisions for phone numbers
            try {
              const existingWithPhone = await prisma.customer.findUnique({
                where: { phone: senderPhone },
              });
              if (existingWithPhone) {
                console.warn(
                  `[IMAP INGESTION] Phone ${maskPhoneNumber(senderPhone)} is already assigned to Customer ${existingWithPhone.id}. Skipping phone assignment for Customer ${customer.id}.`
                );
              } else {
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: { phone: senderPhone },
                });
                console.log(`[IMAP INGESTION] Updated Customer ${customer.id} with phone ${maskPhoneNumber(senderPhone)}.`);
              }
            } catch (phoneErr: any) {
              console.error(`[IMAP INGESTION] Customer phone update error: ${phoneErr?.message}`);
            }
          }

          // 9. Find or create Conversation thread
          let conversation = await prisma.conversation.findFirst({
            where: {
              customerId: customer.id,
              channel: "EMAIL",
              status: { not: "CLOSED" },
            },
            orderBy: { updatedAt: "desc" },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                customerId: customer.id,
                channel: "EMAIL",
                externalThreadId: messageId,
                status: "HUMAN_REQUIRED",
                mode: "HUMAN",
                unreadStaff: true,
                summary: `Email inquiry: ${subject.slice(0, 100)}`,
                notes: `From: ${fromName} <${fromAddress}>\nPhone: ${senderPhone || "Not provided"}`,
              },
            });
          } else {
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                status: "HUMAN_REQUIRED",
                mode: "HUMAN",
                unreadStaff: true,
                lastMessageAt: new Date(),
                summary: `New message: ${subject.slice(0, 100)}`,
              },
            });
          }

          // 10. Record Inbound Message in Conversation
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              customerId: customer.id,
              channel: "EMAIL",
              direction: "INBOUND",
              messageType: "TEXT",
              content: `Subject: ${subject}\n\n${textBody}`,
              externalMessageId: messageId,
              status: "READ",
              isStaffReply: false,
            },
          });

          // 11. Create or update Lead in CRM
          const existingLead = await prisma.lead.findFirst({
            where: { customerId: customer.id },
            orderBy: { createdAt: "desc" },
          });

          // Lead Status Policy:
          // Do not blindly overwrite leadStatus with CONTACTED.
          // Preserve existing progress (e.g. QUALIFIED, HIGH_INTENT, BOOKING_REQUEST, CONFIRMED) unless it is currently NEW.
          let nextLeadStatus = "CONTACTED";
          if (existingLead && existingLead.leadStatus !== "NEW") {
            nextLeadStatus = existingLead.leadStatus;
          }

          const leadPayload = {
            name: fromName !== fromAddress ? fromName : customer.name || "Email Guest",
            email: fromAddress,
            phone: senderPhone || customer.phone || undefined,
            channel: "EMAIL",
            source: "Official Email (info@hotelsherpasoul.com)",
            leadStatus: nextLeadStatus,
            conversationStatus: "HUMAN_REQUIRED",
            scoreReason: `Inbound email inquiry: "${subject.slice(0, 60)}"`,
            notes: `Subject: ${subject}\nPhone: ${senderPhone || "N/A"}\n\n${textBody.slice(0, 1500)}`,
            lastContactAt: new Date(),
          };

          if (existingLead) {
            await prisma.lead.update({
              where: { id: existingLead.id },
              data: leadPayload,
            });
          } else {
            await prisma.lead.create({
              data: {
                customerId: customer.id,
                ...leadPayload,
              },
            });
          }

          // 12. Record deduplication entry in InboundEmailLog
          await prisma.inboundEmailLog.create({
            data: {
              messageId,
              senderEmail: fromAddress,
              senderName: fromName,
              senderPhone: senderPhone || undefined,
              subject,
              snippet: textBody.slice(0, 500),
              status: "PROCESSED",
              receivedAt: receivedDate,
            },
          });

          // 13. Awaited Staff Notification:
          // Send internal alert without failing the email ingestion transaction
          const staffPhone = process.env.HOTEL_WHATSAPP_PHONE || process.env.HOTEL_FRONTDESK_PHONE;
          if (staffPhone) {
            const alertText =
              `📩 *New Email Inquiry*\n\n` +
              `*From:* ${fromName} (${fromAddress})\n` +
              `*Phone:* ${senderPhone || "Not provided"}\n` +
              `*Subject:* ${subject}\n\n` +
              `*Message Snippet:*\n${textBody.slice(0, 250)}...\n\n` +
              `_Logged in CRM Admin Inbox._`;

            try {
              const waResult = await sendWhatsAppMessage({
                to: staffPhone,
                text: alertText,
              });
              if (waResult.success) {
                console.log(`[IMAP INGESTION] Staff WhatsApp notification delivered to ${maskPhoneNumber(staffPhone)} (ID: ${waResult.messageId})`);
              } else {
                console.warn(`[IMAP INGESTION] Staff WhatsApp notification delivery failed: ${waResult.error}`);
              }
            } catch (waErr: any) {
              console.warn(`[IMAP INGESTION] Staff WhatsApp notification threw error: ${waErr?.message}`);
            }
          }

          // 14. Strict Guardrail: Zero guest-facing replies
          if (ENABLE_EMAIL_AUTO_REPLY) {
            // Intentionally disabled in Phase 2
          }

          // 15. Mark processed message as Seen in IMAP mailbox
          // imapflow API verified: messageFlagsAdd(range, flags, { uid: true })
          const markSeen = await client.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
          console.log(`[IMAP INGESTION] Processed UID ${msg.uid} flag update to \\Seen: ${markSeen}`);

          console.log(`[IMAP INGESTION] Successfully ingested email from ${maskEmail(fromAddress)} - Message-ID: ${messageId}`);
          summary.processed++;
        } catch (itemError: any) {
          console.error(`[IMAP INGESTION] Error processing message UID ${msg.uid}:`, itemError?.message);
          summary.errors++;
        }
      }
    } finally {
      lock.release();
    }
  } catch (connError: any) {
    console.error("[IMAP INGESTION] IMAP session error:", connError?.message);
    summary.errors++;
    return NextResponse.json(
      { success: false, error: connError?.message || "IMAP connection error", ...summary },
      { status: 500 }
    );
  } finally {
    // 16. Clean teardown in finally
    await client.logout().catch(() => {});
  }

  summary.durationMs = Date.now() - startTime;
  return NextResponse.json({ success: true, ...summary });
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}