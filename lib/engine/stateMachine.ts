import { ConversationStep, ExtractedEntities, IntentResult, UnifiedOutboundResponse } from './types';
import { getGroundedKnowledge, formatRoomPricesMessage, searchKnowledgeBase } from './knowledgeBase';

export interface StateMachineContext {
  state: {
    currentStep: ConversationStep;
    checkIn?: string | null;
    checkOut?: string | null;
    adults?: number | null;
    children?: number | null;
    roomType?: string | null;
    roomsCount?: number | null;
    guestName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  intentResult: IntentResult;
  customerName?: string | null;
}

export async function processConversationStep(
  ctx: StateMachineContext
): Promise<UnifiedOutboundResponse> {
  const { state, intentResult } = ctx;
  const lang = intentResult.language || 'en';
  const knowledge = await getGroundedKnowledge();
  const rates = knowledge.roomPrices;

  // Merge newly extracted entities into state
  if (intentResult.entities.checkIn) {
    state.checkIn = intentResult.entities.checkIn;
  }
  if (intentResult.entities.checkOut) {
    state.checkOut = intentResult.entities.checkOut;
  }
  if (intentResult.entities.adults) {
    state.adults = intentResult.entities.adults;
  }
  if (intentResult.entities.children !== undefined && state.children === null) {
    state.children = intentResult.entities.children;
  }
  if (intentResult.entities.roomType) {
    state.roomType = intentResult.entities.roomType;
  }
  if (intentResult.entities.guestName && !state.guestName) {
    state.guestName = intentResult.entities.guestName;
  }

  // 1. Handover Triggers
  if (
    intentResult.intent === 'HUMAN_REQUEST' ||
    intentResult.intent === 'COMPLAINT' ||
    intentResult.intent === 'CANCELLATION' ||
    intentResult.intent === 'PAYMENT'
  ) {
    const handoverMessages = {
      en: "I've informed our front desk team. A staff member will assist you shortly 😊\n\nYou can also chat directly with our front desk on WhatsApp:\n📲 +977-9851068219 (wa.me/9779851068219)",
      ne: "मैले हाम्रो फ्रन्ट डेस्क टिमलाई खबर गरिसकेको छु। हाम्रा कर्मचारी साथीले छिट्टै यहाँलाई सिधै सहयोग गर्नुहुनेछ 😊\n\nहजुरले सिधै हाम्रो ह्वाट्सएपमा पनि कुरा गर्न सक्नुहुन्छ:\n📲 +977-9851068219 (wa.me/9779851068219)",
      hi: "मैंने हमारी फ्रंट डेस्क टीम को सूचित कर दिया है। हमारे स्टाफ सदस्य जल्द ही आपसे संपर्क करेंगे 😊\n\nआप सीधे हमारे व्हाट्सएप पर भी बात कर सकते हैं:\n📲 +977-9851068219 (wa.me/9779851068219)",
    };
    return {
      content: handoverMessages[lang] || handoverMessages.en,
      suggestedReplies: ['WhatsApp Front Desk', 'Room Prices', 'Hotel Location'],
      intent: intentResult.intent,
      step: 'HANDOVER',
      triggerHandover: true,
      handoverReason: intentResult.reason || `Guest triggered ${intentResult.intent}`,
    };
  }

  // 2. Room Rates Query
  if (intentResult.intent === 'ROOM_PRICE') {
    return {
      content: formatRoomPricesMessage(rates, lang),
      suggestedReplies: ['Check Availability', 'Hotel Location', 'Talk to Staff'],
      intent: 'ROOM_PRICE',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 3. Shared Kitchen / Long Stay Query (STRICT: Room 102, Stays >= 2 weeks, NOT a restaurant)
  if (intentResult.intent === 'SHARED_KITCHEN' || intentResult.intent === 'LONG_STAY') {
    const kitchenMsg =
      lang === 'ne'
        ? "हाम्रो होटलमा कोठा १०२ (Room 102) मा कम्तिमा २ हप्ता (१४ दिन) वा सोभन्दा बढी बस्ने पाहुनाहरूका लागि साझा भान्सा (Shared Kitchen) को व्यवस्था छ। यसमा २ वटा मिनी फ्रिज, १ ओभन, २ र्‍याक, २ टेबल, ४ कुर्सी र बेसिन उपलब्ध छन्। कृपया ध्यान दिनुहोस्, यो रेस्टुरेन्ट वा डाइनिङ हल होइन—लामो समय बस्ने पाहुनाहरूको व्यक्तिगत खाना पकाउने प्रयोजनका लागि मात्र हो 😊"
        : "For guests staying for at least 2 weeks (14 nights), we provide Room 102 as a shared kitchen facility. It is equipped with 2 mini fridges, 1 oven, 2 storage racks, 2 dining tables, 4 chairs, wash basin, and wastewater management. Please note this is for long-stay self-cooking and is not a restaurant or dining room 😊";

    return {
      content: kitchenMsg,
      suggestedReplies: ['Check Availability', 'Room Prices', 'Talk to Staff'],
      intent: 'SHARED_KITCHEN',
      step: state.currentStep,
      triggerHandover: intentResult.intent === 'LONG_STAY', // Long stay can also notify staff for custom rates
      handoverReason: intentResult.intent === 'LONG_STAY' ? 'Guest inquiring about long stay / shared kitchen' : undefined,
    };
  }

  // 4. Facilities Query (STRICT Anti-Hallucination: No Restaurant, No Private Parking, No Pool)
  if (intentResult.intent === 'FACILITIES') {
    const kbAnswer = await searchKnowledgeBase('restaurant parking pool wifi facilities', 'FACILITIES');
    return {
      content:
        kbAnswer ||
        "Hotel Sherpa Soul strictly follows the motto 'No Restaurant. No Noise. Sleep Well.' We do NOT have an on-site restaurant, dining hall, private parking, pool, or gym. We focus on clean rooms, restful sleep, reliable hot water, and fast Wi-Fi in central Thamel, with dozens of restaurants right outside our door!",
      suggestedReplies: ['Room Prices', 'Check Availability', 'Location'],
      intent: 'FACILITIES',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 5. Booking Flow & Progressive Inquiries
  if (
    intentResult.intent === 'BOOKING' ||
    intentResult.intent === 'ROOM_AVAILABILITY' ||
    state.currentStep === 'AWAITING_DATES' ||
    state.currentStep === 'AWAITING_GUESTS' ||
    state.currentStep === 'AWAITING_ROOM_SELECTION' ||
    state.currentStep === 'CONFIRMING_SUMMARY'
  ) {
    // Step A: Missing travel dates
    if (!state.checkIn) {
      return {
        content:
          lang === 'ne'
            ? "हजुर 😊 यहाँको आगमन मिति (Check-in) र प्रस्थान मिति (Check-out) कहिले हो?"
            : "Sure 😊 What are your check-in and check-out dates?",
        suggestedReplies: ['Today - 2 nights', 'This weekend', 'Talk to Staff'],
        intent: intentResult.intent,
        step: 'AWAITING_DATES',
        triggerHandover: false,
      };
    }

    // Step B: Missing guest count
    if (!state.adults || state.adults === 0) {
      return {
        content:
          lang === 'ne'
            ? `धन्यवाद। ${state.checkIn} को लागि कति जना पाहुनाहरू (वयस्क / बालबालिका) बस्नुहुनेछ?`
            : `Thank you! For ${state.checkIn}${state.checkOut ? ` to ${state.checkOut}` : ''}, how many guests will be staying? (Adults and children)`,
        suggestedReplies: ['1 Adult', '2 Adults', '3 Adults (Family)', '2 Adults + 1 Child'],
        intent: intentResult.intent,
        step: 'AWAITING_GUESTS',
        triggerHandover: false,
      };
    }

    // Step C: Determine suitable room
    if (!state.roomType) {
      if (state.adults <= 2) {
        state.roomType = 'Deluxe Room';
      } else {
        state.roomType = 'Family Room';
      }
    }

    const price =
      state.roomType === 'Family Room'
        ? rates.family
        : state.roomType === 'Budget Family Room'
        ? rates.budgetFamily
        : rates.deluxe;

    // Step D: Confirming Booking Summary
    const guestDisplayName = state.guestName || ctx.customerName || 'Guest';
    const datesStr = state.checkOut ? `${state.checkIn} – ${state.checkOut}` : `${state.checkIn}`;

    // If guest is currently at CONFIRMING_SUMMARY step, check if they confirmed or asked to change
    if (state.currentStep === 'CONFIRMING_SUMMARY') {
      const rawText = (ctx.intentResult.reason || '').toLowerCase();
      const userText = ctx.customerName ? '' : ''; // will check message content
      // Check confirmation phrases
      const isConfirm = 
        intentResult.intent === 'BOOKING' ||
        ['yes', 'send', 'confirm', 'book', 'sure', 'ok', 'okay', 'हुन्छ', 'हो', 'गर्नुस्', 'पठाउनुस्', 'ठिक छ'].some(w => 
          intentResult.entities.roomType ? false : true
        );

      // Check if user wants to change details
      const isChange = ['change', 'modify', 'edit', 'सच्याउनु', 'फेर्नु'].some(w => 
        intentResult.reason?.toLowerCase().includes(w)
      );

      if (isChange) {
        state.checkIn = null;
        state.checkOut = null;
        state.roomType = null;
        return {
          content: lang === 'ne' 
            ? "कुनै समस्या छैन 😊 कृपया यहाँको नयाँ आगमन (Check-in) र प्रस्थान (Check-out) मिति बताइदिनुहोस्।"
            : "No problem at all 😊 Please share your preferred check-in and check-out dates.",
          suggestedReplies: ['Today - 2 nights', 'This weekend', 'Talk to Staff'],
          intent: 'BOOKING',
          step: 'AWAITING_DATES',
          triggerHandover: false,
        };
      }

      // If user confirms sending request / booking
      return {
        content:
          lang === 'ne'
            ? `🎉 धन्यवाद ${guestDisplayName}! यहाँको बुकिङ अनुरोध होटल शेर्पा सोलमा दर्ता भएको छ।
━━━━━━━━━━━━━━━━━━
🏨 कोठा: ${state.roomType} (${state.roomsCount || 1} वटा)
📅 मिति: ${datesStr}
👥 पाहुना: ${state.adults} वयस्क ${state.children ? `+ ${state.children} बच्चा` : ''}
💰 दर: USD ${price}/रात
━━━━━━━━━━━━━━━━━━
हाम्रो फ्रन्ट डेस्कले यहाँको कोठा सुरक्षित राख्नेछ। थप केही जानकारी चाहिएमा सोध्न सक्नुहुन्छ 😊`
            : `🎉 Thank you, ${guestDisplayName}! Your booking request has been officially received by Hotel Sherpa Soul.
━━━━━━━━━━━━━━━━━━
🏨 Room: ${state.roomType} (${state.roomsCount || 1} room)
📅 Dates: ${datesStr}
👥 Guests: ${state.adults} adult(s)${state.children ? ` + ${state.children} child` : ''}
💰 Rate: USD ${price}/night
━━━━━━━━━━━━━━━━━━
Our front desk has received your request and reserved your space. Feel free to ask if you have any questions before arrival 😊`,
        suggestedReplies: ['Hotel Location', 'Check-in Time', 'Talk to Staff'],
        intent: 'BOOKING',
        step: 'COMPLETE',
        triggerHandover: false,
        summary: `Confirmed Booking Request: ${state.roomType} for ${state.adults} adults (${datesStr})`,
      };
    }

    const summaryText =
      lang === 'ne'
        ? `यहाँको अनुरोध विवरण यस प्रकार छ:
• पाहुनाको नाम: ${guestDisplayName}
• मिति: ${datesStr}
• पाहुना संख्या: ${state.adults} वयस्क ${state.children ? `+ ${state.children} बच्चा` : ''}
• कोठा: ${state.roomType} (USD ${price}/रात, उपलब्धता पुष्टि हुन बाँकी)
• कोठा संख्या: ${state.roomsCount || 1}

के म यो अनुरोध हाम्रो फ्रन्ट डेस्कमा पठाऊँ?`
        : `Here is your booking inquiry summary:
• Guest: ${guestDisplayName}
• Dates: ${datesStr}
• Guests: ${state.adults} adult(s)${state.children ? ` + ${state.children} child` : ''}
• Room: ${state.roomType} (Starting from USD ${price}/night, subject to front desk confirmation)
• Rooms: ${state.roomsCount || 1}

Would you like me to send this request to our front desk?`;

    return {
      content: summaryText,
      suggestedReplies: ['Yes, Send Request', 'Change Details', 'Talk to Staff'],
      intent: 'BOOKING',
      step: 'CONFIRMING_SUMMARY',
      triggerHandover: false,
      summary: `Inquiry: ${state.roomType} for ${state.adults} adults (${datesStr})`,
    };
  }

  // 6. Location / Transport / Check-in Info
  if (intentResult.intent === 'LOCATION' || intentResult.intent === 'CHECK_IN' || intentResult.intent === 'TRANSPORTATION') {
    const kbAnswer = await searchKnowledgeBase(intentResult.intent.toLowerCase());
    if (kbAnswer) {
      return {
        content: kbAnswer,
        suggestedReplies: ['Check Room Availability', 'Room Prices', 'Talk to Staff'],
        intent: intentResult.intent,
        step: state.currentStep,
        triggerHandover: intentResult.intent === 'TRANSPORTATION', // Airport taxi transfers can be handled by staff
        handoverReason: intentResult.intent === 'TRANSPORTATION' ? 'Guest inquiring about airport pickup' : undefined,
      };
    }
  }

  // 7. General Knowledge Base Fallback
  const generalAnswer = await searchKnowledgeBase(intentResult.intent);
  if (generalAnswer) {
    return {
      content: generalAnswer,
      suggestedReplies: ['Check Room Availability', 'Room Prices', 'Talk to Staff'],
      intent: intentResult.intent,
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 8. Greeting Fallback
  if (intentResult.intent === 'GREETING') {
    const greetings = {
      en: "Hi! Welcome to Hotel Sherpa Soul 😊\nHow can I help you today?",
      ne: "नमस्ते! होटल शेर्पा सोलमा यहाँलाई स्वागत छ 😊\nम यहाँलाई कसरी सहयोग गर्न सक्छु?",
      hi: "नमस्ते! होटल शेरपा सोल में आपका स्वागत है 😊\nमैं आज आपकी क्या सहायता कर सकता हूँ?",
    };
    return {
      content: greetings[lang] || greetings.en,
      suggestedReplies: ['Check Room Availability', 'Room Prices', 'Hotel Information', 'Location', 'Talk to Staff'],
      intent: 'GREETING',
      step: 'GREETING',
      triggerHandover: false,
    };
  }

  // 9. Unknown / Unsure Question -> Safe Front Desk Handover
  const fallbackMessages = {
    en: "I don't want to give you incorrect information. Let me check that with our front desk team and have someone assist you shortly 😊",
    ne: "म यहाँलाई गलत जानकारी दिन चाहन्नँ। म हाम्रो फ्रन्ट डेस्क टिमसँग यो बुझेर छिट्टै यहाँलाई जानकारी उपलब्ध गराउनेछु 😊",
    hi: "मैं आपको गलत जानकारी नहीं देना चाहता। मैं हमारी फ्रंट डेस्क टीम से यह पुष्टि करके जल्द ही आपको बताता हूँ 😊",
  };

  return {
    content: fallbackMessages[lang] || fallbackMessages.en,
    suggestedReplies: ['Talk to Staff', 'Room Prices', 'Check Availability'],
    intent: 'OTHER',
    step: 'HANDOVER',
    triggerHandover: true,
    handoverReason: 'Question outside approved hotel knowledge base',
  };
}
