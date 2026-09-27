import { ConversationStep, ExtractedEntities, IntentResult, UnifiedOutboundResponse } from './types';
import { getGroundedKnowledge, formatRoomPricesMessage, searchKnowledgeBase } from './knowledgeBase';
import { checkPmsAvailability } from '../pmsClient';
import { prisma } from '../prisma';

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
  customerId?: string | null;
  conversationId?: string | null;
  rawMessage?: string;
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
  if (intentResult.entities.children !== undefined) {
    state.children = intentResult.entities.children;
  }
  if (intentResult.entities.roomType) {
    state.roomType = intentResult.entities.roomType;
  }
  if (intentResult.entities.guestName && !state.guestName) {
    state.guestName = intentResult.entities.guestName;
  }
  if (intentResult.entities.phone) {
    state.phone = intentResult.entities.phone;
  }
  if (intentResult.entities.email) {
    state.email = intentResult.entities.email;
  }

  const frontdeskPhone = knowledge.hotelInfo.phone || '+977-1-4530311';
  const whatsappPhone = knowledge.hotelInfo.whatsapp || '+977-9818259472';

  // 0. AI Identity Query ("Are you a real person?", "Are you an AI/bot?")
  if (intentResult.intent === 'AI_IDENTITY') {
    const aiIdentityMsg = {
      en: "I'm the hotel's chat assistant, but I can also connect you with our staff if you'd prefer.",
      ne: "म होटलको च्याट सहायक हुँ, तर यहाँ चाहनुहुन्छ भने म हाम्रा कर्मचारी साथीसँग पनि तुरुन्त जोडिदिन सक्छु 😊",
      hi: "मैं होटल का चैट असिस्टेंट हूँ, लेकिन अगर आप चाहें तो मैं आपको हमारे स्टाफ से भी जोड़ सकता हूँ 😊",
    };
    return {
      content: aiIdentityMsg[lang] || aiIdentityMsg.en,
      suggestedReplies: ['Talk to Staff', 'Check Availability', 'Room Prices'],
      intent: 'AI_IDENTITY',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 1. Handover Triggers (Staff assistance needed)
  if (
    intentResult.intent === 'HUMAN_REQUEST' ||
    intentResult.intent === 'COMPLAINT' ||
    intentResult.intent === 'CANCELLATION'
  ) {
    const handoverMessages = {
      en: `I've informed our front desk team. A staff member will assist you shortly 😊\n\nYou can also contact our front desk directly:\nWhatsApp: ${whatsappPhone}\nPhone: ${frontdeskPhone}\nEmail: ${knowledge.hotelInfo.email}`,
      ne: `मैले हाम्रो फ्रन्ट डेस्क टिमलाई खबर गरिसकेको छु। हाम्रा कर्मचारी साथीले छिट्टै यहाँलाई सिधै सहयोग गर्नुहुनेछ 😊\n\nयहाँले सिधै हाम्रो फ्रन्ट डेस्कमा पनि सम्पर्क गर्न सक्नुहुन्छ:\nह्वाट्सएप: ${whatsappPhone}\nफोन: ${frontdeskPhone}\nइमेल: ${knowledge.hotelInfo.email}`,
      hi: `मैंने हमारी फ्रंट डेस्क टीम को सूचित कर दिया है। हमारे स्टाफ सदस्य जल्द ही आपसे संपर्क करेंगे 😊\n\nआप सीधे हमारे फ्रंट डेस्क से संपर्क कर सकते हैं:\nWhatsApp: ${whatsappPhone}\nफोन: ${frontdeskPhone}\nईमेल: ${knowledge.hotelInfo.email}`,
    };
    return {
      content: handoverMessages[lang] || handoverMessages.en,
      suggestedReplies: ['Room Prices', 'Hotel Location', 'Check Availability'],
      intent: intentResult.intent,
      step: 'HANDOVER',
      triggerHandover: true,
      handoverReason: intentResult.reason || `Guest triggered ${intentResult.intent}`,
    };
  }

  // 2. Room Rates Query (Context-Aware)
  if (intentResult.intent === 'ROOM_PRICE') {
    if (state.roomType) {
      const roomPrice =
        state.roomType === 'Family Room'
          ? rates.family
          : state.roomType === 'Budget Family Room'
          ? rates.budgetFamily
          : rates.deluxe;
      const priceMsg = {
        en: `Our ${state.roomType} is USD ${roomPrice} per night${state.checkIn ? ` for ${state.checkIn}${state.checkOut ? ` to ${state.checkOut}` : ''}` : ''}. Would you like to reserve it?`,
        ne: `हाम्रो ${state.roomType} प्रति रात USD ${roomPrice} हो${state.checkIn ? ` (${state.checkIn}${state.checkOut ? ` देखि ${state.checkOut}` : ''})` : ''}। के म यो कोठा यहाँको लागि सुरक्षित गरूँ?`,
        hi: `हमारा ${state.roomType} USD ${roomPrice} प्रति रात है${state.checkIn ? ` (${state.checkIn}${state.checkOut ? ` से ${state.checkOut}` : ''})` : ''}। क्या आप इसे बुक करना चाहेंगे?`,
      };
      return {
        content: priceMsg[lang] || priceMsg.en,
        suggestedReplies: ['Yes, Book Now', 'Check Availability', 'Talk to Staff'],
        intent: 'ROOM_PRICE',
        step: state.currentStep,
        triggerHandover: false,
      };
    }

    return {
      content: formatRoomPricesMessage(rates, lang),
      suggestedReplies: ['Check Availability', 'Hotel Location', 'Talk to Staff'],
      intent: 'ROOM_PRICE',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 3. ID / Documentation Requirements Query
  if (intentResult.intent === 'ID_REQUIREMENTS') {
    const idMsg =
      lang === 'ne'
        ? "होटल शेर्पा सोलमा अहिले अनलाइन सोधपुछ वा कोठा सुरक्षित गर्न कुनै पनि परिचयपत्र (ID) वा कागजात अपलोड गर्नु पर्दैन 😊\n\nहोटल चेक-इन (Check-in) गर्दा मात्र:\n• विदेशी पाहुनाहरू: मान्य राहदानी (Passport) र भिसा\n• नेपाली तथा भारतीय पाहुनाहरू: कुनै पनि सरकारी परिचयपत्र (नागरिकता, ड्राइभिङ लाइसेन्स, मतदाता परिचयपत्र वा पासपोर्ट)\n\nहोटल आइपुगेपछि फ्रन्ट डेस्कमा देखाए पुग्छ। भुक्तानी पनि चेक-इनकै समयमा गर्न सकिन्छ।"
        : "For online inquiries or direct reservations with Hotel Sherpa Soul, you do NOT need to upload or submit any ID online right now 😊\n\nDuring check-in upon arrival at the hotel:\n• Foreign guests: Valid Passport & Visa\n• Nepali & Indian guests: Any government-issued photo ID (Citizenship, Driving License, Voter ID, or Passport)\n\nOur front desk will verify your details smoothly upon check-in. Payment is also made directly on arrival!";

    return {
      content: idMsg,
      suggestedReplies: ['Check Room Availability', 'Room Prices', 'Hotel Location', 'Talk to Staff'],
      intent: 'ID_REQUIREMENTS',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 4. Payment Policy Query
  if (intentResult.intent === 'PAYMENT') {
    const payMsg =
      lang === 'ne'
        ? "होटल शेर्पा सोलमा सिधै बुक गर्दा कुनै पनि अग्रिम रकम (Advance / Deposit) तिर्नु पर्दैन 😊\n\nयहाँले होटल आगमन (Check-in) को समयमा सजिलै भुक्तानी गर्न सक्नुहुन्छ:\n• नगद (Cash in NPR, USD, EUR)\n• क्रेडिट / डेबिट कार्ड (Visa, Mastercard)\n• फोनपे (Fonepay) / eSewa QR\n\nसाथै, सिधै बुक गर्दा यहाँले तुरुन्त १०% छुट (Direct Booking Discount) पनि पाउनुहुन्छ!"
        : "At Hotel Sherpa Soul, no advance deposit or prepayment is required for direct bookings 😊\n\nYou can pay easily upon arrival at check-in via:\n• Cash (NPR, USD, EUR)\n• Credit / Debit Cards (Visa, Mastercard)\n• Fonepay / QR payments (for Nepali bank accounts)\n\nPlus, you enjoy an instant 10% discount when booking directly with us!";

    return {
      content: payMsg,
      suggestedReplies: ['Check Room Availability', 'Room Prices', 'Hotel Location', 'Talk to Staff'],
      intent: 'PAYMENT',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 4.5. Booking Inquiry (How to book / source)
  if (intentResult.intent === 'BOOKING_INQUIRY') {
    const inquiryMsg =
      lang === 'ne'
        ? "होटल शेर्पा सोलमा कोठा बुक गर्न एकदमै सजिलो छ 😊\n\n१. यहाँ च्याटमा आफ्नो आगमन मिति र पाहुना संख्या बताउनुहोस्।\n२. हाम्रो फ्रन्ट डेस्कले यहाँको कोठा तुरुन्त सुरक्षित राख्नेछ।\n३. कुनै अग्रिम रकम चाहिँदैन—होटल चेक-इन गर्दा भुक्तानी गरे पुग्छ।\n\n✨ सिधै बुक गर्दा १०% छुट पनि प्राप्त हुन्छ! के म यहाँको लागि कोठा बुकिङ प्रक्रिया सुरु गरूँ?"
        : "Booking directly with Hotel Sherpa Soul is fast and simple 😊\n\n1. Share your travel dates and number of guests right here.\n2. We confirm and reserve your room directly with our front desk.\n3. No advance deposit required—you pay conveniently at check-in.\n\n✨ Direct bookings receive a guaranteed 10% discount! Would you like to check room availability for your dates?";

    return {
      content: inquiryMsg,
      suggestedReplies: ['Check Room Availability', 'Room Prices', 'Talk to Staff'],
      intent: 'BOOKING_INQUIRY',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 4.6. Room Amenities, AC & Categories Query
  if (intentResult.intent === 'ROOM_AMENITIES') {
    const amenitiesMsg =
      lang === 'ne'
        ? `होटल शेर्पा सोलका कोठाका प्रकार र उपलब्ध सुविधाहरू (Room Amenities) यस प्रकार छन्:

🏨 १. डिलक्स कोठा (Deluxe Room) — सुरुवाती USD ${rates.deluxe}/रात
• एयर कन्डिसनिङ (AC) सहित
• २४ सै घण्टा तातो पानीसहितको आधुनिक निजी बाथरुम (Attached Bathroom)
• द्रुत गतिको वाइफाइ (High-speed Wi-Fi), आरामदायी ओछ्यान र शान्त वातावरण

👨‍👩‍👧 २. फेमिली कोठा (Family Room) — सुरुवाती USD ${rates.family}/रात
• एयर कन्डिसनिङ (AC) सहितको ठूलो तथा फराकिलो कोठा (३ वयस्क + १ बच्चा सम्म)
• २४ सै घण्टा तातो पानीसहितको निजी बाथरुम र द्रुत वाइफाइ

🌿 ३. बजेट फेमिली कोठा (Budget Family Room) — सुरुवाती USD ${rates.budgetFamily}/रात
• Non-AC (यसमा एसी छैन, फ्यानको राम्रो व्यवस्था छ)
• एसी बाहेक अरू सबै सुविधा (निजी बाथरुम, २४ सै घण्टा तातो पानी, द्रुत वाइफाइ) डिलक्स र फेमिली सरह समान छन्!

✨ लामो समय बस्ने पाहुनाका लागि विशेष उपहार (FREE Shared Kitchen):
२ हप्ता (१४ दिन) वा सोभन्दा बढी बस्ने पाहुनाहरूका लागि हामी कोठा १०२ (Room 102) मा पूर्ण सुविधायुक्त साझा भान्सा (Shared Kitchen) बिल्कुल निःशुल्क उपलब्ध गराउँछौँ! यसमा २ वटा मिनी फ्रिज, १ ओभन, २ र्‍याक, टेबल, कुर्सी, पानीको बेसिन र खाना पकाउने ठाउँ उपलब्ध छ।

के यहाँ आफ्नो यात्रा मितिको लागि उपलब्धता हेर्न चाहनुहुन्छ?`
        : `Here are the room categories and amenities at Hotel Sherpa Soul:

🏨 1. Deluxe Room — Starting USD ${rates.deluxe}/night
• Equipped with Air Conditioning (AC)
• Private attached modern bathroom with 24/7 hot shower
• High-speed Wi-Fi, comfortable queen/twin bed, quiet peaceful atmosphere

👨‍👩‍👧 2. Family Room — Starting USD ${rates.family}/night
• Equipped with Air Conditioning (AC)
• Spacious family layout accommodating up to 3 adults + 1 child
• Private attached bathroom with 24/7 hot shower & high-speed Wi-Fi

🌿 3. Budget Family Room — Starting USD ${rates.budgetFamily}/night
• Non-AC (Equipped with fan instead of AC)
• Note: Aside from AC, all other amenities (private attached bath, 24/7 hot shower, high-speed Wi-Fi, comfortable beds) are identical to our Deluxe and Family rooms!

✨ Special Long-Stay Highlight (FREE Self-Sharing Kitchen):
For guests staying 2 weeks (14 nights) or more, we provide Room 102 as a fully equipped Shared Kitchen completely FREE of charge! It comes with 2 mini fridges, 1 microwave/oven, 2 storage racks, dining tables, chairs, cooking area, and wash basin.

Would you like to check room availability for your dates?`;

    return {
      content: amenitiesMsg,
      suggestedReplies: ['Check Availability', 'Room Prices', 'Book a Room', 'Talk to Staff'],
      intent: 'ROOM_AMENITIES',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 4.7. Shared Kitchen / Long Stay Query (STRICT: Room 102, Stays >= 2 weeks, FREE of charge)
  if (intentResult.intent === 'SHARED_KITCHEN' || intentResult.intent === 'LONG_STAY') {
    const kitchenMsg =
      lang === 'ne'
        ? "हाम्रो होटलमा २ हप्ता (१४ दिन) वा सोभन्दा बढी लामो समय बस्ने पाहुनाहरूका लागि कोठा १०२ (Room 102) मा पूर्ण सुविधायुक्त साझा भान्सा (Shared Kitchen) बिल्कुल निःशुल्क (FREE) उपलब्ध छ 😊\n\nयसमा २ वटा मिनी फ्रिज, १ ओभन, २ र्‍याक, २ टेबल, ४ कुर्सी र पानीको बेसिन उपलब्ध छन्। पाहुनाहरूले आफ्नै व्यक्तिगत खाना आफैँ पकाएर आनन्द लिन सक्नुहुन्छ। कृपया ध्यान दिनुहोस्, यो रेस्टुरेन्ट वा डाइनिङ हल होइन—लामो समय बस्ने पाहुनाहरूको व्यक्तिगत खाना पकाउने प्रयोजनका लागि मात्र हो।"
        : "For guests staying for 2 weeks (14 nights) or more, Hotel Sherpa Soul provides Room 102 as a fully equipped Shared Kitchen completely FREE of charge 😊\n\nIt is equipped with 2 mini fridges, 1 microwave/oven, 2 storage racks, 2 dining tables, 4 chairs, wash basin, and wastewater management for your self-cooking comfort. Please note this is for long-stay self-cooking and is not an on-site restaurant or public dining room.";

    return {
      content: kitchenMsg,
      suggestedReplies: ['Check Availability', 'Room Prices', 'Talk to Staff'],
      intent: 'SHARED_KITCHEN',
      step: state.currentStep,
      triggerHandover: intentResult.intent === 'LONG_STAY',
      handoverReason: intentResult.intent === 'LONG_STAY' ? 'Guest inquiring about long stay / shared kitchen' : undefined,
    };
  }

  // 4.8. Facilities Query (STRICT Anti-Hallucination: No Restaurant, No Private Parking, No Pool)
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

  // 5. Post-Booking State Handling (If booking is already COMPLETE)
  if (state.currentStep === 'COMPLETE') {
    const rawLower = (ctx.rawMessage || intentResult.reason || '').toLowerCase();

    // Check if guest explicitly wants a NEW booking
    const isNewBooking =
      rawLower.includes('new booking') ||
      rawLower.includes('another room') ||
      rawLower.includes('book another') ||
      rawLower.includes('start over') ||
      rawLower.includes('reset') ||
      rawLower.includes('अर्को कोठा') ||
      rawLower.includes('नयाँ बुक') ||
      rawLower.includes('नयाँ बुकिङ');

    const hasNewDetails =
      Boolean(intentResult.entities.adults) ||
      intentResult.entities.children !== undefined ||
      Boolean(intentResult.entities.checkIn);

    if (isNewBooking || hasNewDetails) {
      state.currentStep = 'AWAITING_DATES';
      state.checkIn = intentResult.entities.checkIn || null;
      state.checkOut = intentResult.entities.checkOut || null;
      state.adults = intentResult.entities.adults || null;
      state.children = intentResult.entities.children !== undefined ? intentResult.entities.children : null;
      state.roomType = intentResult.entities.roomType || null;

      if (!state.checkIn) {
        const guestsText = state.adults
          ? (lang === 'ne'
              ? `${state.adults} वयस्क${state.children && state.children > 0 ? ` + ${state.children} बालबालिका` : ''}`
              : `${state.adults} adult(s)${state.children && state.children > 0 ? ` + ${state.children} child${state.children > 1 ? 'ren' : ''}` : ''}`)
          : '';

        const replyContent =
          lang === 'ne'
            ? `धन्यवाद! ${guestsText ? `${guestsText}को लागि ` : ''}यहाँको आगमन (Check-in) र प्रस्थान (Check-out) मिति कहिले हो?`
            : `Thank you! ${guestsText ? `For ${guestsText}, ` : ''}what are your preferred check-in and check-out dates?`;

        return {
          content: replyContent,
          suggestedReplies: ['Today - 2 nights', 'This weekend', 'Talk to Staff'],
          intent: 'BOOKING',
          step: 'AWAITING_DATES',
          triggerHandover: false,
        };
      }
    }

    // If guest asks for confirmation letter, voucher, confirmation slip, status, or confirmation
    const isConfirmOrLetter =
      intentResult.intent === 'BOOKING_CONFIRMATION' ||
      rawLower.includes('confirm') ||
      rawLower.includes('conformation') ||
      rawLower.includes('letter') ||
      rawLower.includes('slip') ||
      rawLower.includes('voucher') ||
      rawLower.includes('receipt') ||
      rawLower.includes('proof') ||
      rawLower.includes('status') ||
      rawLower.includes('sure') ||
      rawLower.includes('done') ||
      rawLower.includes('पक्का') ||
      rawLower.includes('पुष्टि') ||
      rawLower.includes('लेटर') ||
      rawLower.match(/^(yes|ok|okay|fine|done)$/i);

    if (isConfirmOrLetter) {
      let latestReservation = ctx.customerId
        ? await prisma.reservation.findFirst({
            where: { customerId: ctx.customerId },
            orderBy: { createdAt: 'desc' },
            include: { roomType: true },
          })
        : null;

      if (!latestReservation) {
        latestReservation = await prisma.reservation.findFirst({
          orderBy: { createdAt: 'desc' },
          include: { roomType: true },
        });
      }

      const bookingCode =
        latestReservation?.bookingCode || `HSS-${Math.floor(100000 + Math.random() * 900000)}`;
      const roomName = latestReservation?.roomType?.name || state.roomType || 'Deluxe Room';
      const checkInStr = latestReservation?.checkInDate
        ? latestReservation.checkInDate.toISOString().split('T')[0]
        : state.checkIn || 'Confirmed';
      const checkOutStr = latestReservation?.checkOutDate
        ? latestReservation.checkOutDate.toISOString().split('T')[0]
        : state.checkOut || 'Next day';
      const rawGuest = latestReservation?.guestName || state.guestName || ctx.customerName || '';
      const isAnon = !rawGuest || rawGuest === 'Guest' || rawGuest === 'Website Visitor';
      const guestName = isAnon ? (lang === 'ne' ? 'आदरणीय पाहुना' : 'Valued Guest') : rawGuest;
      const adultsCount = latestReservation?.adults || state.adults || 1;
      const childrenCount = latestReservation?.children || state.children || 0;
      const guestsStr =
        lang === 'ne'
          ? `${adultsCount} वयस्क${childrenCount > 0 ? ` + ${childrenCount} बालबालिका` : ''}`
          : `${adultsCount} adult(s)${childrenCount > 0 ? ` + ${childrenCount} child${childrenCount > 1 ? 'ren' : ''}` : ''}`;

      const reply =
        lang === 'ne'
          ? `🏨 होटल शेर्पा सोल — आधिकारिक बुकिङ पुष्टि विवरण (Booking Confirmation Slip)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 बुकिङ कोड (Booking Ref): ${bookingCode}
👤 पाहुनाको नाम: ${guestName}
🏨 सुरक्षित कोठा: ${roomName}
📅 आगमन (Check-in): ${checkInStr} (दिउँसो २:०० बजेदेखि)
📅 प्रस्थान (Check-out): ${checkOutStr} (मध्यान्ह १२:०० बजेसम्म)
👥 पाहुना संख्या: ${guestsStr}
📍 होटल ठेगाना: २६ ठमेल भगवती मार्ग, काठमाडौँ
📞 फ्रन्ट डेस्क: +९७७-१-४५३०३११ / ह्वाट्सएप: +९७७ ९८५१०६८२१९
✉️ इमेल: info@hotelsherpasoul.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ अवस्था: कोठा आधिकारिक रूपमा सुरक्षित (CONFIRMED & RESERVED)
• कुनै अग्रिम रकम (Deposit) चाहिँदैन, होटल चेक-इनको समयमा भुक्तानी गर्न सकिन्छ।
• आगमनको समयमा आफ्नो परिचयपत्र (नागरिकता/राहदानी) देखाउनुहोला।
• यदि भिसा वा यात्रा प्रयोजनका लागि होटलको छाप (Official Stamp) सहितको औपचारिक PDF लेटर आवश्यक परेमा हाम्रो फ्रन्ट डेस्कको ह्वाट्सएप वा इमेल (info@hotelsherpasoul.com) मा तुरुन्त प्राप्त गर्न सक्नुहुन्छ!`
          : `🏨 HOTEL SHERPA SOUL — OFFICIAL RESERVATION CONFIRMATION / LETTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Booking Ref: ${bookingCode}
👤 Guest Name: ${guestName}
🏨 Reserved Room: ${roomName}
📅 Check-in: ${checkInStr} (from 14:00)
📅 Check-out: ${checkOutStr} (until 12:00 noon)
👥 Guests: ${guestsStr}
📍 Hotel Address: 26 Thamel Bhagwati Marg, Thamel, Kathmandu, Nepal
📞 Front Desk: +977-1-4530311 / WhatsApp: +977-9851068219
✉️ Email: info@hotelsherpasoul.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Status: OFFICIALLY CONFIRMED & RESERVED
• No advance deposit required. Pay comfortably at check-in (Cash / Card / QR).
• Foreign guests present passport; Nepali/Indian guests present government ID upon arrival.
• If you need a formal PDF confirmation letter on hotel letterhead with official company stamp for Nepal Tourist Visa or trek permits, our front desk can email (info@hotelsherpasoul.com) or WhatsApp it to you instantly!`;

      return {
        content: reply,
        suggestedReplies: ['Hotel Location', 'Check-in Time', 'ID Requirements', 'Talk to Staff'],
        intent: 'BOOKING_CONFIRMATION',
        step: 'COMPLETE',
        triggerHandover: false,
      };
    }
  }

  // 5.5. Booking Confirmation / Voucher Letter Inquiry (Before Booking)
  if (intentResult.intent === 'BOOKING_CONFIRMATION') {
    let latestReservation = ctx.customerId
      ? await prisma.reservation.findFirst({
          where: { customerId: ctx.customerId },
          orderBy: { createdAt: 'desc' },
          include: { roomType: true },
        })
      : null;

    if (latestReservation) {
      const bookingCode = latestReservation.bookingCode;
      const roomName = latestReservation.roomType?.name || 'Deluxe Room';
      const checkInStr = latestReservation.checkInDate.toISOString().split('T')[0];
      const checkOutStr = latestReservation.checkOutDate.toISOString().split('T')[0];
      const guestName = latestReservation.guestName || 'Valued Guest';

      const reply =
        lang === 'ne'
          ? `🏨 होटल शेर्पा सोल — आधिकारिक बुकिङ पुष्टि विवरण\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 बुकिङ कोड: ${bookingCode}\n👤 पाहुना: ${guestName}\n🏨 कोठा: ${roomName}\n📅 मिति: ${checkInStr} देखि ${checkOutStr}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ यहाँको बुकिङ सुरक्षित छ! कुनै औपचारिक PDF लेटर चाहिने भए हाम्रो फ्रन्ट डेस्क (+९७७ ९८५१०६८२१९ / info@hotelsherpasoul.com) मा सम्पर्क गर्न सक्नुहुन्छ 😊`
          : `🏨 HOTEL SHERPA SOUL — OFFICIAL RESERVATION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 Booking Ref: ${bookingCode}\n👤 Guest: ${guestName}\n🏨 Room: ${roomName}\n📅 Dates: ${checkInStr} to ${checkOutStr}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ Your room is officially reserved! If you need a stamped PDF voucher for visa or permits, our front desk (+977-9851068219 / info@hotelsherpasoul.com) will email or WhatsApp it to you 😊`;

      return {
        content: reply,
        suggestedReplies: ['Hotel Location', 'Check-in Time', 'Talk to Staff'],
        intent: 'BOOKING_CONFIRMATION',
        step: state.currentStep,
        triggerHandover: false,
      };
    }

    const noBookingLetterMsg =
      lang === 'ne'
        ? "हजुर! होटल शेर्पा सोलले भिसा, यात्रा अनुमति वा ट्रेकिङ प्रयोजनका लागि आधिकारिक लेटरहेड र कम्पनीको छाप (Official Stamp) सहितको बुकिङ कन्फर्मेसन लेटर (Booking Confirmation Letter / Voucher) निःशुल्क उपलब्ध गराउँछ 😊\n\nकुनै अग्रिम रकम (Advance Deposit) तिर्नु पर्दैन। यहाँको आगमन मिति र पाहुना संख्या बताउनुभएपछि हामी तुरुन्तै यहाँको नाममा बुकिङ दर्ता गरी लेटर उपलब्ध गराउनेछौँ। के म यहाँको लागि कोठा बुकिङ प्रक्रिया सुरु गरूँ?"
        : "Yes! Hotel Sherpa Soul provides an official Reservation Confirmation Letter & Digital Voucher on official hotel letterhead with company stamp completely FREE of charge 😊\n\n• Ideal for Nepal Tourist Visa, trekking permits, and travel documentation.\n• No advance deposit required!\n\nOnce you share your travel dates and number of guests, we will instantly reserve your room and generate your official confirmation letter. Would you like to check room availability for your dates?";

    return {
      content: noBookingLetterMsg,
      suggestedReplies: ['Check Room Availability', 'Room Prices', 'Talk to Staff'],
      intent: 'BOOKING_CONFIRMATION',
      step: state.currentStep,
      triggerHandover: false,
    };
  }

  // 6. Progressive Booking Flow
  if (
    intentResult.intent === 'BOOKING' ||
    intentResult.intent === 'ROOM_AVAILABILITY' ||
    state.currentStep === 'AWAITING_DATES' ||
    state.currentStep === 'AWAITING_GUESTS' ||
    state.currentStep === 'AWAITING_ROOM_SELECTION' ||
    state.currentStep === 'CONFIRMING_SUMMARY' ||
    Boolean(intentResult.entities.adults) ||
    Boolean(intentResult.entities.checkIn)
  ) {
    // Step A: Missing travel dates
    if (!state.checkIn) {
      const guestsText = state.adults
        ? (lang === 'ne'
            ? `${state.adults} वयस्क${state.children && state.children > 0 ? ` + ${state.children} बालबालिका` : ''}`
            : `${state.adults} adult(s)${state.children && state.children > 0 ? ` + ${state.children} child${state.children > 1 ? 'ren' : ''}` : ''}`)
        : '';

      const content =
        lang === 'ne'
          ? `हजुर, ${guestsText ? `${guestsText}को लागि ` : ''}यहाँ कुन मितिमा बस्ने योजना बनाउँदै हुनुहुन्छ?`
          : `Sure! ${guestsText ? `For ${guestsText}, ` : ''}what dates are you planning to stay?`;

      return {
        content,
        suggestedReplies: ['Today - 2 nights', 'This weekend', 'Room Prices', 'Talk to Staff'],
        intent: 'BOOKING',
        step: 'AWAITING_DATES',
        triggerHandover: false,
      };
    }

    // Step B: Missing guest count
    if (!state.adults || state.adults === 0) {
      const content =
        lang === 'ne'
          ? `धन्यवाद! ${state.checkIn}${state.checkOut ? ` देखि ${state.checkOut}` : ''} को लागि कति जना पाहुनाहरू बस्नुहुनेछ?`
          : `Thanks! For ${state.checkIn}${state.checkOut ? ` to ${state.checkOut}` : ''}, how many guests will be staying?`;

      return {
        content,
        suggestedReplies: ['1 Adult', '2 Adults', '3 Adults (Family)', '2 Adults + 1 Child'],
        intent: intentResult.intent,
        step: 'AWAITING_GUESTS',
        triggerHandover: false,
      };
    }

    // Step C: Determine suitable room based on occupancy
    if (!state.roomType) {
      const totalGuests = (state.adults || 1) + (state.children || 0);
      if (totalGuests > 3 || (state.adults || 1) > 2) {
        state.roomType = 'Family Room';
      } else {
        state.roomType = 'Deluxe Room';
      }
    }

    const price =
      state.roomType === 'Family Room'
        ? rates.family
        : state.roomType === 'Budget Family Room'
        ? rates.budgetFamily
        : rates.deluxe;

    const datesStr = state.checkOut ? `${state.checkIn} – ${state.checkOut}` : `${state.checkIn}`;
    const guestsDisplay =
      lang === 'ne'
        ? `${state.adults} वयस्क${state.children && state.children > 0 ? ` + ${state.children} बालबालिका` : ''}`
        : `${state.adults} adult(s)${state.children && state.children > 0 ? ` + ${state.children} child${state.children > 1 ? 'ren' : ''}` : ''}`;

    // Step C.2: Real-time PMS availability check
    if (state.checkIn) {
      const cIn = state.checkIn;
      const cOut = state.checkOut || new Date(new Date(state.checkIn).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      try {
        const pmsAvail = await checkPmsAvailability({
          checkIn: cIn,
          checkOut: cOut,
          adults: state.adults || 2,
          children: state.children || 0,
        });

        if (pmsAvail.success && pmsAvail.data && !pmsAvail.data.isAnyAvailable) {
          return {
            content:
              lang === 'ne'
                ? `माफ गर्नुहोस् 😊 यहाँले छान्नुभएको मिति (${cIn} देखि ${cOut}) मा हाम्रा सबै कोठाहरू भरिभराउ भइसकेका छन्। के यहाँ अर्को कुनै मितिमा यात्रा गर्न सक्नुहुन्छ?`
                : `We apologize, all rooms at Hotel Sherpa Soul are fully booked for your selected dates (${cIn} to ${cOut}). Would you like to check different dates, or speak with our staff?`,
            suggestedReplies: ['Check Different Dates', 'Talk to Staff'],
            intent: 'ROOM_AVAILABILITY',
            step: 'AWAITING_DATES',
            triggerHandover: false,
          };
        }
      } catch (e) {
        // Continue gracefully if PMS is temporarily offline
      }
    }

    // Step D: Confirming Booking or Recommending
    const rawName = state.guestName || ctx.customerName || '';
    const isAnonymous = !rawName || rawName === 'Guest' || rawName === 'Website Visitor' || rawName === 'Valued Guest';
    const guestDisplayName = isAnonymous
      ? (lang === 'ne' ? 'आदरणीय पाहुना' : 'Valued Guest')
      : rawName;

    // Check if user confirmed booking or asked to change
    if (state.currentStep === 'CONFIRMING_SUMMARY') {
      const rawText = (ctx.rawMessage || intentResult.reason || '').toLowerCase();

      // Check if user wants to change details
      const isChange = ['change', 'modify', 'edit', 'सच्याउनु', 'फेर्नु', 'बदल्नु'].some(w =>
        rawText.includes(w)
      );

      if (isChange) {
        state.checkIn = null;
        state.checkOut = null;
        state.roomType = null;
        return {
          content:
            lang === 'ne'
              ? "कुनै समस्या छैन 😊 कृपया यहाँको नयाँ आगमन र प्रस्थान मिति बताइदिनुहोस्।"
              : "No problem at all 😊 Please share your preferred check-in and check-out dates.",
          suggestedReplies: ['Today - 2 nights', 'This weekend', 'Talk to Staff'],
          intent: 'BOOKING',
          step: 'AWAITING_DATES',
          triggerHandover: false,
        };
      }

      // Check if user is answering their name
      const isBookingCommand = /\b(book|reserve|reservation|can i|how much|price|cost|confirm|yes|ok|okay|fine|done|sure|सक्छु|गरिदिनुहोस्|गर्नुहोस्)\b/i.test(rawText);
      if (isAnonymous && !isBookingCommand) {
        if (rawText.match(/^(my name is|i am|this is|नाम)\s+/i) || (rawText.length >= 3 && rawText.length <= 35 && !rawText.includes('?'))) {
          state.guestName = rawText.replace(/^(my name is|i am|this is|name is|नाम)\s+/i, '').trim();
        }
      }

      // If name is still missing, ask for guest name
      if (!state.guestName || state.guestName === 'Guest' || state.guestName === 'Website Visitor') {
        const askNameMsg = {
          en: `Great! For the reservation, what is your full name and the best phone number to reach you?`,
          ne: `हुन्छ हजुर! बुकिङ सुरक्षित गर्नको लागि यहाँको पूरा नाम र फोन नम्बर बताइदिनुहोला?`,
          hi: `बिल्कुल! बुकिंग के लिए आपका पूरा नाम और फोन नंबर क्या है?`,
        };
        return {
          content: askNameMsg[lang] || askNameMsg.en,
          suggestedReplies: ['Talk to Staff'],
          intent: 'BOOKING',
          step: 'CONFIRMING_SUMMARY',
          triggerHandover: false,
        };
      }

      // Guest confirmed and name is present -> Proceed to COMPLETE (chatDispatcher will create in PMS)
      return {
        content:
          lang === 'ne'
            ? `धन्यवाद ${state.guestName}! म यहाँको बुकिङ होटल शेर्पा सोलको सिस्टममा दर्ता गर्दैछु...`
            : `Thank you, ${state.guestName}! Reserving your ${state.roomType} now...`,
        suggestedReplies: ['Talk to Staff'],
        intent: 'BOOKING',
        step: 'COMPLETE',
        triggerHandover: false,
        summary: `Booking Request: ${state.roomType} for ${guestsDisplay} (${datesStr})`,
      };
    }

    // First time presenting the room recommendation
    const recommendationMsg = {
      en: `For ${guestsDisplay}, our ${state.roomType} is available at USD ${price} per night for ${datesStr}. Would you like me to reserve this for you?`,
      ne: `${guestsDisplay}को लागि हाम्रो ${state.roomType} प्रति रात USD ${price} मा उपलब्ध छ (${datesStr})। के म यो कोठा यहाँको लागि बुक गरूँ?`,
      hi: `${guestsDisplay} के लिए हमारा ${state.roomType} USD ${price} प्रति रात उपलब्ध है (${datesStr})। क्या आप इसे बुक करना चाहेंगे?`,
    };

    return {
      content: recommendationMsg[lang] || recommendationMsg.en,
      suggestedReplies: ['Yes, Reserve Room', 'Change Dates', 'Room Prices', 'Talk to Staff'],
      intent: 'BOOKING',
      step: 'CONFIRMING_SUMMARY',
      triggerHandover: false,
      summary: `Inquiry: ${state.roomType} for ${guestsDisplay} (${datesStr})`,
    };
  }

  // 7. Hotel Knowledge Base Queries (Location, Luggage, Trekking, Rooftop, Hot Water, Wi-Fi, Transport, Policies, etc.)
  const rawQuery = ctx.rawMessage || intentResult.reason || '';

  if (
    intentResult.intent === 'LUGGAGE' ||
    intentResult.intent === 'TREKKING' ||
    intentResult.intent === 'ROOFTOP' ||
    intentResult.intent === 'HOT_WATER' ||
    intentResult.intent === 'WIFI' ||
    intentResult.intent === 'DISCOUNT' ||
    intentResult.intent === 'SAFETY' ||
    intentResult.intent === 'LOCATION' ||
    intentResult.intent === 'CHECK_IN' ||
    intentResult.intent === 'CHECK_OUT' ||
    intentResult.intent === 'TRANSPORTATION' ||
    intentResult.intent === 'POLICY' ||
    intentResult.intent === 'HOTEL_INFORMATION' ||
    intentResult.intent === 'FLOORS' ||
    intentResult.intent === 'ELEVATOR' ||
    intentResult.intent === 'COUPLE_FRIENDLY'
  ) {
    const kbAnswer = await searchKnowledgeBase(rawQuery, lang, intentResult.intent);
    if (kbAnswer) {
      return {
        content: kbAnswer,
        suggestedReplies: ['Check Room Availability', 'Room Prices', 'Talk to Staff'],
        intent: intentResult.intent,
        step: state.currentStep,
        triggerHandover: false,
      };
    }
  }

  // 8. General Knowledge Base Fallback using Raw User Message
  if (rawQuery) {
    const generalAnswer = await searchKnowledgeBase(rawQuery, lang);
    if (generalAnswer) {
      return {
        content: generalAnswer,
        suggestedReplies: ['Check Room Availability', 'Room Prices', 'Talk to Staff'],
        intent: intentResult.intent !== 'OTHER' ? intentResult.intent : 'HOTEL_INFORMATION',
        step: state.currentStep,
        triggerHandover: false,
      };
    }
  }

  // 8.4. Meta Ads Inquiry (Click-to-WhatsApp Ads)
  if (intentResult.intent === 'AD_INQUIRY') {
    const adWelcome = {
      en: "Hi! Thanks for checking out our ad 😊 We're a peaceful hotel in central Thamel with clean rooms starting at USD 20/night. What dates are you looking at?",
      ne: "नमस्ते! हाम्रो विज्ञापन हेरेर सम्पर्क गर्नुभएकोमा धन्यवाद 😊 हामी ठमेलमा अवस्थित शान्त होटल हौँ, कोठाको सुरुवाती दर USD २०/रात छ। यहाँ कुन मितिको लागि कोठा हेर्दै हुनुहुन्छ?",
      hi: "नमस्ते! हमारा विज्ञापन देखकर संपर्क करने के लिए धन्यवाद 😊 हम थमेल में स्थित एक शांत होटल हैं, कमरों का किराया USD 20/रात से शुरू है। आप किन तारीखों के लिए देख रहे हैं?",
    };
    return {
      content: adWelcome[lang] || adWelcome.en,
      suggestedReplies: ['Today - 2 nights', 'This weekend', 'Room Prices', 'Hotel Location'],
      intent: 'AD_INQUIRY',
      step: 'AWAITING_DATES',
      triggerHandover: false,
    };
  }

  // 8.5. Greeting Fallback
  if (intentResult.intent === 'GREETING') {
    const greetings = {
      en: "Hi! Welcome to Hotel Sherpa Soul 😊 What dates are you looking at?",
      ne: "नमस्ते! होटल शेर्पा सोलमा यहाँलाई स्वागत छ 😊 यहाँ कुन मितिको लागि कोठा खोज्दै हुनुहुन्छ?",
      hi: "नमस्ते! होटल शेरपा सोल में आपका स्वागत है 😊 आप किन तारीखों के लिए कमरा देख रहे हैं?",
    };
    return {
      content: greetings[lang] || greetings.en,
      suggestedReplies: ['Today - 2 nights', 'This weekend', 'Room Prices', 'Talk to Staff'],
      intent: 'GREETING',
      step: 'AWAITING_DATES',
      triggerHandover: false,
    };
  }

  // 9. Unknown / Unsure Question -> Safe Front Desk Handover
  const fallbackMessages = {
    en: `I don't want to give you the wrong information on this one. I'll pass this to our staff so they can help you 😊\n\nYou can also contact our front desk directly:\nWhatsApp: ${whatsappPhone}\nPhone: ${frontdeskPhone}\nEmail: ${knowledge.hotelInfo.email}`,
    ne: `म यहाँलाई गलत जानकारी दिन चाहन्नँ। म हाम्रो टिमलाई यो जिम्मा दिन्छु ताकि यहाँले सही जानकारी पाउन सक्नुहोस् 😊\n\nयहाँले सिधै हाम्रो फ्रन्ट डेस्कमा पनि सम्पर्क गर्न सक्नुहुन्छ:\nह्वाट्सएप: ${whatsappPhone}\nफोन: ${frontdeskPhone}\nइमेल: ${knowledge.hotelInfo.email}`,
    hi: `मैं आपको गलत जानकारी नहीं देना चाहता। मैं इसे हमारे स्टाफ को भेज देता हूँ ताकि वे आपकी पूरी मदद कर सकें 😊\n\nआप सीधे हमारे फ्रंट डेस्क से संपर्क कर सकते हैं:\nWhatsApp: ${whatsappPhone}\nफोन: ${frontdeskPhone}\nईमेल: ${knowledge.hotelInfo.email}`,
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
