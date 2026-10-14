import { prisma } from '../prisma';
import { UnifiedInboundMessage, UnifiedOutboundResponse, Channel } from './types';
import { detectIntent } from './intentDetector';
import { processConversationStep } from './stateMachine';
import { sendWhatsAppMessage } from '../meta/whatsapp';
import { sendMessengerMessage } from '../meta/messenger';
import { sendInstagramMessage } from '../meta/instagram';
import { maskPhoneNumber } from '../masking';

export async function processInboundMessage(
  msg: UnifiedInboundMessage
): Promise<{
  success: boolean;
  reply?: string;
  outbound?: UnifiedOutboundResponse;
  deduplicated?: boolean;
  conversationId?: string;
  customerId?: string;
}> {
  // 1. Idempotency Check (Prevent duplicate Meta webhook events)
  if (msg.externalMessageId) {
    const existing = await prisma.message.findUnique({
      where: { externalMessageId: msg.externalMessageId },
    });
    if (existing) {
      console.log(`[DEDUPLICATION] Skipping already processed message ${msg.externalMessageId}`);
      return { success: true, deduplicated: true };
    }
  }

  // 2. Identity Resolution & Conversation Lookup
  let customer = null;
  let conversation = null;

  // If conversationId is directly provided (e.g. session-scoped website chat)
  if (msg.conversationId) {
    const existingConv = await prisma.conversation.findUnique({
      where: { id: msg.conversationId },
      include: { state: true, customer: true },
    });
    if (existingConv) {
      conversation = existingConv;
      customer = existingConv.customer;
    }
  }

  if (!customer) {
    if (msg.channel === 'WHATSAPP' || msg.senderPhone) {
      const phone = msg.senderPhone || msg.senderId;
      customer = await prisma.customer.findFirst({
        where: { OR: [{ phone }, { whatsappId: phone }] },
      });
    } else if (msg.channel === 'MESSENGER') {
      customer = await prisma.customer.findFirst({
        where: { messengerId: msg.senderId },
      });
    } else if (msg.channel === 'INSTAGRAM') {
      customer = await prisma.customer.findFirst({
        where: { instagramId: msg.senderId },
      });
    } else if (msg.channel === 'WEBSITE' && msg.senderId) {
      customer = await prisma.customer.findUnique({
        where: { id: msg.senderId },
      }).catch(() => null);
    }
  }

  // Create customer if not found
  if (!customer) {
    const phone = msg.senderPhone || (msg.channel === 'WHATSAPP' ? msg.senderId : undefined);
    customer = await prisma.customer.create({
      data: {
        name: msg.senderName || 'Guest',
        phone,
        email: msg.senderEmail,
        whatsappId: msg.channel === 'WHATSAPP' ? msg.senderId : undefined,
        messengerId: msg.channel === 'MESSENGER' ? msg.senderId : undefined,
        instagramId: msg.channel === 'INSTAGRAM' ? msg.senderId : undefined,
        firstChannel: msg.channel,
      },
    });
  } else if (msg.senderName && customer.name === 'Guest') {
    // Update name if guest gave one
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: msg.senderName },
    });
  }

  // 3. Conversation Lookup or Creation
  if (!conversation) {
    conversation = await prisma.conversation.findFirst({
      where: {
        customerId: customer.id,
        channel: msg.channel,
        status: { not: 'CLOSED' },
      },
      include: { state: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        channel: msg.channel,
        status: 'OPEN',
        mode: 'BOT',
        state: {
          create: {
            currentStep: 'GREETING',
            guestName: customer.name || undefined,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
          },
        },
      },
      include: { state: true },
    });
  }

  // 4. Save Inbound Message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      customerId: customer.id,
      channel: msg.channel,
      direction: 'INBOUND',
      messageType: msg.messageType || 'TEXT',
      content: msg.content,
      rawPayload: msg.rawPayload ? JSON.stringify(msg.rawPayload) : null,
      externalMessageId: msg.externalMessageId || null,
      status: 'READ',
    },
  });

  // 5. Check if staff is in HUMAN mode (human takeover active!)
  if (conversation.mode === 'HUMAN') {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadStaff: true,
        status: 'HUMAN_REQUIRED',
      },
    });
    console.log(`[HUMAN MODE ACTIVE] Bot reply suppressed for conversation ${conversation.id}. Staff must reply.`);
    return { success: true, reply: '' };
  }

  // 6. Natural Intent Classification & Progressive State Machine
  const intentResult = detectIntent(msg.content);

  // Initialize or retrieve state object
  const currentState = {
    currentStep: (conversation.state?.currentStep as any) || 'GREETING',
    checkIn: conversation.state?.checkIn,
    checkOut: conversation.state?.checkOut,
    adults: conversation.state?.adults,
    children: conversation.state?.children,
    roomType: conversation.state?.roomType,
    roomsCount: conversation.state?.roomsCount,
    guestName: conversation.state?.guestName || customer.name,
    phone: conversation.state?.phone || customer.phone,
    email: conversation.state?.email || customer.email,
  };

  const outbound = await processConversationStep({
    state: currentState,
    intentResult,
    customerName: customer.name,
    customerId: customer.id,
    conversationId: conversation.id,
    rawMessage: msg.content,
  });

  // 7. Update Conversation State in DB
  if (conversation.state) {
    await prisma.conversationState.update({
      where: { id: conversation.state.id },
      data: {
        currentStep: outbound.step,
        checkIn: currentState.checkIn,
        checkOut: currentState.checkOut,
        adults: currentState.adults,
        children: currentState.children,
        roomType: currentState.roomType,
        roomsCount: currentState.roomsCount,
        guestName: currentState.guestName,
        lastIntent: outbound.intent,
        intentConfidence: intentResult.confidence,
      },
    });
  }

  // 8. Lead Scoring and Pipeline Status
  let leadStatus = 'CONTACTED';
  let conversationStatus = 'OPEN';
  let scoreReason = undefined;

  if (outbound.triggerHandover) {
    conversationStatus = 'HUMAN_REQUIRED';
  } else if (outbound.step === 'CONFIRMING_SUMMARY' || outbound.intent === 'BOOKING') {
    leadStatus = 'HIGH_INTENT';
    conversationStatus = 'HIGH_INTENT';
    scoreReason = `HIGH — Guest provided travel details: ${currentState.checkIn || 'Dates pending'} for ${currentState.adults || '1'} adult(s)`;
  } else if (currentState.checkIn && currentState.adults) {
    leadStatus = 'QUALIFIED';
    conversationStatus = 'OPEN';
    scoreReason = 'QUALIFIED — Dates and guest count supplied';
  }

  // Generate or update concise conversation summary
  let summary = conversation.summary;
  if (outbound.summary) {
    summary = outbound.summary;
  } else if (currentState.checkIn && currentState.roomType) {
    summary = `Inquiry for ${currentState.roomType}, ${currentState.checkIn}${currentState.checkOut ? ` to ${currentState.checkOut}` : ''}, ${currentState.adults || 1} guest(s).`;
  }

  // 8.1. Chatbot Flow Completion -> Create BOOKING_REQUEST Lead (No premature PMS booking!)
  const isNewlyCompleted = conversation.state?.currentStep !== 'COMPLETE' && outbound.step === 'COMPLETE';
  if (isNewlyCompleted) {
    const inquiryCode = `INQ-${Math.floor(10000 + Math.random() * 90000)}`;
    leadStatus = 'BOOKING_REQUEST';
    conversationStatus = 'BOOKING_REQUEST';
    scoreReason = `INQUIRY SUBMITTED — Pending Front Desk Verification & PMS Approval (${inquiryCode})`;

    const guestNameForInquiry =
      currentState.guestName && currentState.guestName !== 'Guest' && currentState.guestName !== 'Website Visitor'
        ? currentState.guestName
        : customer.name && customer.name !== 'Guest' && customer.name !== 'Website Visitor'
        ? customer.name
        : 'Valued Guest';

    let checkInDate = new Date();
    let checkOutDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (currentState.checkIn) {
      const parsedIn = new Date(currentState.checkIn);
      if (!isNaN(parsedIn.getTime())) checkInDate = parsedIn;
    }
    if (currentState.checkOut) {
      const parsedOut = new Date(currentState.checkOut);
      if (!isNaN(parsedOut.getTime())) checkOutDate = parsedOut;
    }

    const pricePerNight = currentState.roomType?.toUpperCase().includes('FAMILY') && !currentState.roomType?.toUpperCase().includes('BUDGET') ? 30 : 20;
    const roomsCount = currentState.roomsCount || 1;
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))) || 1;
    const subtotal = pricePerNight * nights * roomsCount;
    const directDiscount = Math.round(subtotal * 0.1);
    const estimatedTotal = subtotal - directDiscount;

    // Construct honest, clear Inquiry Receipt (NO claim of confirmed room until staff approves)
    const lang = intentResult.language || 'en';
    if (lang === 'ne') {
      outbound.content = `🛎️ होटल शेर्पा सोल — बुकिङ सोधपुछ दर्ता भयो 😊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 सोधपुछ कोड (Inquiry Ref): ${inquiryCode}
👤 पाहुनाको नाम: ${guestNameForInquiry}
🏨 रोजिएको कोठा: ${currentState.roomType || 'Deluxe Room'}
📅 मिति: ${currentState.checkIn || 'तोकिन बाँकी'} देखि ${currentState.checkOut || 'भोलिपल्ट'} (${nights} रात)
👥 पाहुना संख्या: ${currentState.adults || 1} वयस्क${currentState.children ? ` + ${currentState.children} बालबालिका` : ''}
💰 अनुमानित रकम: USD $${estimatedTotal} (१०% छुट सहित)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ अवस्था: कर्मचारी स्वीकृति पर्खिरहेको (PENDING STAFF APPROVAL)
• धन्यवाद! यहाँको बुकिङ सोधपुछ हाम्रो फ्रन्ट डेस्क टिममा सुरक्षित पुगेको छ।
• हाम्रा कर्मचारी साथीले कोठाको उपलब्धता रुजु गरी छिट्टै यहाँलाई सम्पर्क गर्नुहुनेछ।
• कुनै अग्रिम रकम चाहिँदैन, होटल आगमनमा भुक्तानी गर्न सकिन्छ।
• सिधै फ्रन्ट डेस्कसँग कुरा गर्न वा तुरुन्त कोठा निश्चित गर्न: +९७७-९८१८२५९४७२ मा सम्पर्क गर्न सक्नुहुन्छ!`;
    } else if (lang === 'hi') {
      outbound.content = `🛎️ होटल शेरपा सोल — बुकिंग पूछताछ प्राप्त हुई 😊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 पूछताछ संदर्भ: ${inquiryCode}
👤 अतिथि: ${guestNameForInquiry}
🏨 कमरा: ${currentState.roomType || 'Deluxe Room'}
📅 तारीख: ${currentState.checkIn || 'लंबित'} से ${currentState.checkOut || 'अगले दिन'} (${nights} रात)
👥 अतिथि संख्या: ${currentState.adults || 1} वयस्क${currentState.children ? ` + ${currentState.children} बच्चे` : ''}
💰 अनुमानित कुल: USD $${estimatedTotal} (10% छूट सहित)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ स्थिति: फ्रंट डेस्क समीक्षा लंबित (PENDING APPROVAL)
• धन्यवाद! आपकी पूछताछ हमारे फ्रंट डेस्क को भेज दी गई है।
• हमारे स्टाफ सदस्य उपलब्धता की जांच कर जल्द ही आपसे संपर्क करेंगे।
• चेक-इन पर ही भुगतान मान्य है। तत्काल पुष्टि के लिए +977-9818259472 पर संपर्क करें!`;
    } else {
      outbound.content = `🛎️ HOTEL SHERPA SOUL — BOOKING INQUIRY RECEIVED 😊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Inquiry Reference: ${inquiryCode}
👤 Guest Name: ${guestNameForInquiry}
🏨 Preferred Room: ${currentState.roomType || 'Deluxe Room'}
📅 Travel Dates: ${currentState.checkIn || 'Pending'} to ${currentState.checkOut || 'Next day'} (${nights} night(s))
👥 Guests: ${currentState.adults || 1} adult(s)${currentState.children ? ` + ${currentState.children} child(ren)` : ''}
💰 Estimated Total: USD $${estimatedTotal} (Instant 10% Direct Discount applied)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ Status: PENDING FRONT DESK APPROVAL & ROOM ALLOCATION
• Thank you! Your booking request has been delivered to our front desk.
• Our team is reviewing room status and will contact you via WhatsApp shortly to finalize your stay.
• No advance deposit required — pay comfortably upon check-in (Cash, Card, QR).
• For immediate confirmation or questions, message our front desk at +977-9818259472.`;
    }
  }

  // Update Conversation Status
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: conversationStatus,
      lastMessageAt: new Date(),
      unreadStaff: outbound.triggerHandover,
      summary,
      language: intentResult.language,
    },
  });

  // Update or create Lead record
  const existingLead = await prisma.lead.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
  });

  const leadData = {
    name: currentState.guestName || customer.name,
    phone: currentState.phone || customer.phone,
    email: currentState.email || customer.email,
    channel: msg.channel,
    source: msg.campaignInfo?.campaign ? `Meta Ad: ${msg.campaignInfo.campaign}` : msg.channel,
    campaign: msg.campaignInfo?.campaign,
    campaignId: msg.campaignInfo?.campaignId,
    adset: msg.campaignInfo?.adset,
    adsetId: msg.campaignInfo?.adsetId,
    ad: msg.campaignInfo?.ad,
    adId: msg.campaignInfo?.adId,
    checkIn: currentState.checkIn,
    checkOut: currentState.checkOut,
    adults: currentState.adults,
    children: currentState.children,
    roomType: currentState.roomType,
    roomsRequested: currentState.roomsCount || 1,
    leadStatus,
    conversationStatus,
    scoreReason,
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

  // 9. Save Outbound Message
  const savedMsg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      customerId: customer.id,
      channel: msg.channel,
      direction: 'OUTBOUND',
      messageType: outbound.suggestedReplies?.length ? 'BUTTON' : 'TEXT',
      content: outbound.content,
      status: 'SENT',
    },
  });

  // 10. Dispatch to Channel and track delivery
  if (msg.channel === 'WHATSAPP') {
    const phone = msg.senderPhone || msg.senderId;
    const waRes = await sendWhatsAppMessage({
      to: phone,
      text: outbound.content,
      buttons: outbound.suggestedReplies,
    });
    if (waRes.success && waRes.messageId) {
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { externalMessageId: waRes.messageId },
      });
    } else if (!waRes.success) {
      console.error(`[WhatsApp Dispatch Failed] ${waRes.error} for recipient ${maskPhoneNumber(phone)}`);
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { status: 'FAILED' },
      });
    }
  } else if (msg.channel === 'MESSENGER') {
    const fbRes = await sendMessengerMessage({
      recipientId: msg.senderId,
      text: outbound.content,
      quickReplies: outbound.suggestedReplies,
    });
    if (fbRes.success && fbRes.messageId) {
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { externalMessageId: fbRes.messageId },
      });
    } else if (!fbRes.success) {
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { status: 'FAILED' },
      });
    }
  } else if (msg.channel === 'INSTAGRAM') {
    const igRes = await sendInstagramMessage({
      recipientId: msg.senderId,
      text: outbound.content,
    });
    if (igRes.success && igRes.messageId) {
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { externalMessageId: igRes.messageId },
      });
    } else if (!igRes.success) {
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { status: 'FAILED' },
      });
    }
  }

  return {
    success: true,
    reply: outbound.content,
    outbound,
    conversationId: conversation?.id,
    customerId: customer?.id,
  };
}
