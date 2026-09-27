import { prisma } from '../prisma';
import { UnifiedInboundMessage, UnifiedOutboundResponse, Channel } from './types';
import { detectIntent } from './intentDetector';
import { processConversationStep } from './stateMachine';
import { sendWhatsAppMessage } from '../meta/whatsapp';
import { sendMessengerMessage } from '../meta/messenger';
import { sendInstagramMessage } from '../meta/instagram';
import { createPmsBooking } from '../pmsClient';

export async function processInboundMessage(
  msg: UnifiedInboundMessage
): Promise<{ success: boolean; reply?: string; outbound?: UnifiedOutboundResponse; deduplicated?: boolean }> {
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

  // 2. Identity Resolution / Customer Lookup
  let customer = null;
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
  let conversation = await prisma.conversation.findFirst({
    where: {
      customerId: customer.id,
      channel: msg.channel,
      status: { not: 'CLOSED' },
    },
    include: { state: true },
    orderBy: { updatedAt: 'desc' },
  });

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

  // Automated Booking Creation only once when first reaching COMPLETE
  const isNewlyConfirmed = conversation.state?.currentStep !== 'COMPLETE' && outbound.step === 'COMPLETE';
  if (isNewlyConfirmed) {
    leadStatus = 'CONFIRMED';
    conversationStatus = 'CONFIRMED';
    scoreReason = `AUTOMATED BOOKING CONFIRMED — Room: ${currentState.roomType || 'Deluxe Room'}`;

    const roomTypeCode = currentState.roomType?.toUpperCase().includes('BUDGET')
      ? 'BUDGET_FAMILY'
      : currentState.roomType?.toUpperCase().includes('FAMILY')
      ? 'FAMILY'
      : 'DELUXE';

    let matchedRoomType = await prisma.roomType.findFirst({
      where: { code: roomTypeCode },
    });
    if (!matchedRoomType) {
      matchedRoomType = await prisma.roomType.findFirst();
    }

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

    const pricePerNight = matchedRoomType?.basePriceUsd || 20;
    const roomsCount = currentState.roomsCount || 1;
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))) || 1;
    const totalPriceUsd = pricePerNight * nights * roomsCount;
    const guestNameForBooking =
      currentState.guestName && currentState.guestName !== 'Guest' && currentState.guestName !== 'Website Visitor'
        ? currentState.guestName
        : customer.name && customer.name !== 'Guest' && customer.name !== 'Website Visitor'
        ? customer.name
        : 'Valued Guest';

    const guestPhone = currentState.phone || customer.phone || (msg.channel === 'WHATSAPP' ? msg.senderId : null);
    const guestEmail = currentState.email || customer.email;

    // PMS API requires at least one of phone or email
    const pmsPhone = guestPhone || (msg.channel === 'WHATSAPP' ? msg.senderId : `+977-98${Math.floor(10000000 + Math.random() * 90000000)}`);
    const pmsEmail = guestEmail || `guest.${customer.id.slice(-6)}@hotelsherpasoul.com`;

    // Call Hotel Sherpa Soul PMS directly for real-time room lock and reservation
    let officialBookingCode: string | null = null;
    let assignedRoomNumber: string | null = null;
    let voucherUrl: string | null = null;
    let pmsSuccess = false;

    try {
      const pmsResult = await createPmsBooking({
        guestName: guestNameForBooking,
        phone: pmsPhone,
        email: pmsEmail,
        channel: msg.channel,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        roomTypeName: currentState.roomType || 'Deluxe Room',
        adults: currentState.adults || 1,
        children: currentState.children || 0,
        specialRequests: `Direct booking via ${msg.channel} Chatbot`,
        externalMessageId: msg.externalMessageId || `BOT-${Date.now()}`,
        threadId: msg.senderId,
      });

      if (pmsResult.success && pmsResult.data?.reservationNumber) {
        pmsSuccess = true;
        officialBookingCode = pmsResult.data.reservationNumber;
        assignedRoomNumber = pmsResult.data.roomNumber || null;
        voucherUrl = pmsResult.data.voucherUrl || null;
        console.log(`[PMS Integration] Successfully registered booking in PMS: ${officialBookingCode} for ${guestNameForBooking}`);
      } else {
        console.warn('[PMS Integration] PMS booking was not confirmed:', pmsResult.error);
      }
    } catch (pmsErr: any) {
      console.error('[PMS Integration] Failed to connect to PMS API:', pmsErr.message);
    }

    if (pmsSuccess && officialBookingCode && matchedRoomType) {
      await prisma.reservation.create({
        data: {
          bookingCode: officialBookingCode,
          customerId: customer.id,
          roomTypeId: matchedRoomType.id,
          guestName: guestNameForBooking,
          guestPhone,
          guestEmail,
          checkInDate,
          checkOutDate,
          adults: currentState.adults || 1,
          children: currentState.children || 0,
          totalPriceUsd,
          status: 'CONFIRMED',
          source: msg.channel,
          notes: assignedRoomNumber
            ? `Official PMS Reservation ${officialBookingCode} (Room ${assignedRoomNumber})`
            : `PMS Reservation Reference: ${officialBookingCode}`,
        },
      });

      // Human-feeling natural confirmation message
      const lang = intentResult.language || 'en';
      if (lang === 'ne') {
        outbound.content = `धन्यवाद ${guestNameForBooking}! यहाँको बुकिङ होटल शेर्पा सोलमा आधिकारिक रूपमा दर्ता भएको छ।\n\n📌 बुकिङ कोड: ${officialBookingCode}${assignedRoomNumber ? ` (कोठा ${assignedRoomNumber})` : ''}\n🏨 कोठा: ${currentState.roomType || 'Deluxe Room'}\n📅 मिति: ${currentState.checkIn} देखि ${currentState.checkOut || 'भोलिपल्ट'} (${nights} रात)\n💰 दर: USD ${pricePerNight}/रात\n${voucherUrl ? `📲 डिजिटल चेक-इन: ${voucherUrl}\n` : ''}\nकुनै अग्रिम रकम तिर्नु पर्दैन, होटल आगमनमा भुक्तानी गर्न सकिन्छ। हामी यहाँलाई स्वागत गर्न उत्सुक छौँ!`;
      } else if (lang === 'hi') {
        outbound.content = `धन्यवाद ${guestNameForBooking}! आपकी बुकिंग होटल शेरपा सोल में दर्ज हो गई है।\n\n📌 बुकिंग कोड: ${officialBookingCode}${assignedRoomNumber ? ` (कमरा ${assignedRoomNumber})` : ''}\n🏨 कमरा: ${currentState.roomType || 'Deluxe Room'}\n📅 तारीख: ${currentState.checkIn} से ${currentState.checkOut || 'अगले दिन'} (${nights} रात)\n💰 दर: USD ${pricePerNight}/रात\n${voucherUrl ? `📲 डिजिटल वाउचर: ${voucherUrl}\n` : ''}\nअग्रिम भुगतान की आवश्यकता नहीं है, चेक-इन पर भुगतान करें। स्वागत है!`;
      } else {
        outbound.content = `Perfect. I've got your booking confirmed for ${nights} night${nights > 1 ? 's' : ''}, from ${currentState.checkIn} to ${currentState.checkOut || 'next day'}, for ${currentState.adults || 1} adult(s).\n\nYou're booked in a ${currentState.roomType || 'Deluxe Room'} at USD ${pricePerNight} per night.\nBooking Ref: ${officialBookingCode}${assignedRoomNumber ? ` (Room ${assignedRoomNumber})` : ''}\n${voucherUrl ? `Digital Check-in: ${voucherUrl}\n` : ''}\nNo advance deposit required—you can pay comfortably at check-in. We look forward to welcoming you!`;
      }
    } else {
      // If PMS unavailable or room sold out, do NOT invent confirmation. Escalate to front desk!
      outbound.step = 'HANDOVER';
      outbound.triggerHandover = true;
      leadStatus = 'BOOKING_REQUEST';
      conversationStatus = 'HUMAN_REQUIRED';
      scoreReason = 'PMS Confirmation Pending / Staff Assistance Required';

      const lang = intentResult.language || 'en';
      if (lang === 'ne') {
        outbound.content = `धन्यवाद ${guestNameForBooking}! म हाम्रो फ्रन्ट डेस्क टिमसँग यो बुझेर यहाँको कोठा सुनिश्चित गर्छु। हाम्रा कर्मचारी साथीले छिट्टै यहाँलाई सम्पर्क गर्नुहुनेछ 😊`;
      } else if (lang === 'hi') {
        outbound.content = `धन्यवाद ${guestNameForBooking}! मैं हमारी फ्रंट डेस्क टीम से पुष्टि करके आपका कमरा सुरक्षित करवाता हूँ। हमारे स्टाफ सदस्य जल्द ही आपसे संपर्क करेंगे 😊`;
      } else {
        outbound.content = `Thank you, ${guestNameForBooking}! Let me check that with our front desk team so they can arrange your room personally. Someone from our staff will reach out to you shortly 😊`;
      }
    }
  }

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
    if (!waRes.success) {
      console.error(`[WhatsApp Dispatch Failed] ${waRes.error} for phone ${phone}`);
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
    if (!fbRes.success) {
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
    if (!igRes.success) {
      await prisma.message.update({
        where: { id: savedMsg.id },
        data: { status: 'FAILED' },
      });
    }
  }

  return { success: true, reply: outbound.content, outbound };
}
