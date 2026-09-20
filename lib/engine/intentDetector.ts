import { Intent, IntentResult, SupportedLanguage, ExtractedEntities } from './types';

// Language detection
export function detectLanguage(text: string): SupportedLanguage {
  // Devanagari script detection (Unicode range U+0900 to U+097F)
  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    // Check specific Hindi markers first (words distinct to Hindi)
    const hindiMarkers = ['क्या', 'कमरा', 'किराया', 'कितना', 'चाहिए', 'बात', 'हूँ', 'हैं', 'है'];
    const hasHindi = hindiMarkers.some(m => text.includes(m));

    // Check specific Nepali markers (words distinct to Nepali)
    const nepaliMarkers = ['छ', 'हुनुहुन्छ', 'हजुर', 'कति', 'पर्यो', 'पर्छ', 'राम्रो', 'ठाउँ', 'कोठा', 'गर्नुहोस्', 'गर्छु'];
    const hasNepali = nepaliMarkers.some(m => text.includes(m));

    if (hasHindi && !hasNepali) return 'hi';
    if (hasNepali) return 'ne';

    return 'ne'; // Default to Nepali in Kathmandu hotel context
  }
  return 'en';
}

function normalizeDigits(str: string): string {
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[०-९]/g, (char) => String(devanagariDigits.indexOf(char)));
}

// Entity extraction from free text
export function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = {};
  const normalized = normalizeDigits(text);
  const lower = normalized.toLowerCase();

  // Adults extraction
  const adultsMatch =
    lower.match(/(\d+)\s*(adult|adults|grown|people|person|persons|guests?|jana|जना|वयस्क|मान्छे)/i) ||
    lower.match(/(two|three|four|one|1|2|3|4|एक|दुई|तीन|चार|पाँच)\s*(adult|adults|guests?|people|जना|वयस्क)/i);
  if (adultsMatch) {
    const wordToNum: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4,
      'एक': 1, 'दुई': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5
    };
    const val = wordToNum[adultsMatch[1].toLowerCase()] ?? parseInt(adultsMatch[1], 10);
    if (!isNaN(val)) entities.adults = val;
  }

  // Children extraction
  const childMatch =
    lower.match(/(\d+)\s*(child|children|kid|kids|bachha|बच्चा|बालबालिका)/i) ||
    lower.match(/(one|two|three|four|1|2|3|4|एक|दुई|तीन|चार|पाँच)\s*(child|children|kid|kids|bachha|बच्चा|बालबालिका)/i);
  if (childMatch) {
    const wordToNum: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4,
      'एक': 1, 'दुई': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5
    };
    const val = wordToNum[childMatch[1].toLowerCase()] ?? parseInt(childMatch[1], 10);
    if (!isNaN(val)) entities.children = val;
  }

  // Room type extraction
  if (lower.includes('budget') || lower.includes('budget family')) {
    entities.roomType = 'Budget Family Room';
  } else if (lower.includes('family') && !lower.includes('budget')) {
    entities.roomType = 'Family Room';
  } else if (lower.includes('deluxe') || lower.includes('double') || lower.includes('single')) {
    entities.roomType = 'Deluxe Room';
  }

  // Date ranges extraction (Supports Month First, Date First, Relative dates, Quick replies)
  const months = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

  // 1. Explicit Month Day to (Month) Day (e.g., 'sep 20 to 22', 'sep.22 to 24', 'from today sep 20 to 22', 'sep 20 - sep 22')
  const m1 = lower.match(new RegExp('(' + months + ')\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|-|until|till)\\s*(?:(' + months + ')\\s*)?(\\d{1,2})(?:st|nd|rd|th)?', 'i'));
  if (m1) {
    const startMonth = m1[1].replace('.', '');
    const startDay = m1[2];
    const endMonth = m1[3] ? m1[3].replace('.', '') : startMonth;
    const endDay = m1[4];
    entities.checkIn = `${startMonth} ${startDay}`;
    entities.checkOut = `${endMonth} ${endDay}`;
  }

  // 2. Day Month to Day Month OR Day to Day Month (e.g., '20 sep to 22 sep', '20 to 22 sep')
  if (!entities.checkIn) {
    const m2 = lower.match(new RegExp('(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:(' + months + ')\\s*)?(?:to|-|until|till)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(' + months + ')', 'i'));
    if (m2) {
      const startDay = m2[1];
      const endMonth = m2[4].replace('.', '');
      const startMonth = m2[2] ? m2[2].replace('.', '') : endMonth;
      const endDay = m2[3];
      entities.checkIn = `${startMonth} ${startDay}`;
      entities.checkOut = `${endMonth} ${endDay}`;
    }
  }

  // 3. Numeric slash/dash date ranges (e.g. '20/09 to 22/09', '2026-09-20 to 2026-09-22')
  if (!entities.checkIn) {
    const m3 = lower.match(/(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s*(?:to|-|until|till)\s*(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i);
    if (m3) {
      entities.checkIn = m3[1].trim();
      entities.checkOut = m3[2].trim();
    }
  }

  // 4. Relative dates: 'today - 2 nights', 'today', 'tonight', 'aaja', 'आज'
  if (!entities.checkIn && (lower.includes('today') || lower.includes('tonight') || lower.includes('aaja') || lower.includes('आज'))) {
    const today = new Date();
    entities.checkIn = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const nightsMatch = lower.match(/(\d+)\s*nights?/);
    const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 1;
    const outDate = new Date(today);
    outDate.setDate(today.getDate() + nights);
    entities.checkOut = outDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // 5. 'tomorrow', 'bholi', 'भोलि'
  if (!entities.checkIn && (lower.includes('tomorrow') || lower.includes('bholi') || lower.includes('भोलि'))) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    entities.checkIn = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const nightsMatch = lower.match(/(\d+)\s*nights?/);
    const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 1;
    const outDate = new Date(tomorrow);
    outDate.setDate(tomorrow.getDate() + nights);
    entities.checkOut = outDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // 6. 'this weekend'
  if (!entities.checkIn && lower.includes('weekend')) {
    entities.checkIn = 'This Friday';
    entities.checkOut = 'This Sunday';
  }

  // 7. Duration only: e.g. '2 nights', 'for 2 nights', 'two nights', '2 days'
  if (!entities.checkIn) {
    const durationMatch = lower.match(/(?:for\s+)?(\d+|one|two|three|four|five)\s*(?:nights?|days?|रात|दिन)/i);
    if (durationMatch) {
      const w2n: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
      const nights = w2n[durationMatch[1].toLowerCase()] ?? parseInt(durationMatch[1], 10);
      if (!isNaN(nights) && nights > 0) {
        const today = new Date();
        entities.checkIn = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const outDate = new Date(today);
        outDate.setDate(today.getDate() + nights);
        entities.checkOut = outDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
  }

  // 8. Single date mentioned fallback
  if (!entities.checkIn) {
    const single = lower.match(new RegExp('(?:on\\s+)?(' + months + '\\s*\\d{1,2}|\\d{1,2}\\s*' + months + '|\\d{1,2}[/-]\\d{1,2})', 'i'));
    if (single) {
      entities.checkIn = single[1].trim();
    }
  }

  // Guest name if guest explicitly says "My name is X" or "I am X"
  const nameMatch = text.match(/(?:my name is|i am|this is|नाम)\s+([a-zA-Z\u0900-\u097F\s]{2,30})/i);
  if (nameMatch) {
    entities.guestName = nameMatch[1].trim();
  }

  return entities;
}

// Intent Classification
export function detectIntent(text: string): IntentResult {
  const language = detectLanguage(text);
  const entities = extractEntities(text);
  const lower = text.toLowerCase().trim();

  // 1. Human Handover Request
  if (
    lower.includes('human') ||
    lower.includes('talk to staff') ||
    lower.includes('speak to staff') ||
    lower.includes('speak with staff') ||
    lower.includes('real person') ||
    lower.includes('agent') ||
    lower.includes('front desk officer') ||
    lower.includes('call me') ||
    lower.includes('म मान्छेसँग कुरा गर्न चाहन्छु') ||
    lower.includes('कर्मचारीसँग कुरा') ||
    lower.includes('बात करनी है')
  ) {
    return { intent: 'HUMAN_REQUEST', confidence: 0.99, language, entities, reason: 'Guest explicitly requested human staff assistance.' };
  }

  // 2. Complaints or Anger
  if (
    lower.includes('complaint') ||
    lower.includes('terrible') ||
    lower.includes('horrible') ||
    lower.includes('bad service') ||
    lower.includes('angry') ||
    lower.includes('cheat') ||
    lower.includes('scam') ||
    lower.includes('disappointed') ||
    lower.includes('worst') ||
    lower.includes('नराम्रो') ||
    lower.includes('शिकायत')
  ) {
    return { intent: 'COMPLAINT', confidence: 0.95, language, entities, reason: 'Guest expressing grievance or complaint.' };
  }

  // 3. Cancellation / Refund
  if (
    lower.includes('cancel') ||
    lower.includes('cancellation') ||
    lower.includes('refund') ||
    lower.includes('money back') ||
    lower.includes('रद्द') ||
    lower.includes('फिर्ता')
  ) {
    return { intent: 'CANCELLATION', confidence: 0.95, language, entities, reason: 'Guest inquiring about cancellation or refund.' };
  }

  // 4. Payment Issues or Inquiries
  if (
    lower.includes('payment') ||
    lower.includes('how to pay') ||
    lower.includes('pay ') ||
    lower.includes('paying') ||
    lower.includes('credit card') ||
    lower.includes('debit card') ||
    lower.includes('cash') ||
    lower.includes('deposit') ||
    lower.includes('advance payment') ||
    lower.includes('advance for booking') ||
    lower.includes('advance') ||
    lower.includes('prepay') ||
    lower.includes('fonepay') ||
    lower.includes('esewa') ||
    lower.includes('qr') ||
    lower.includes('भुक्तानी') ||
    lower.includes('पैसा')
  ) {
    return { intent: 'PAYMENT', confidence: 0.90, language, entities, reason: 'Guest inquiring about payment methods or deposit policies.' };
  }

  // 4.5. ID / Documentation Requirements
  if (
    /\b(id|ids|identification|passport|passports|citizenship|visa|document|documents)\b/i.test(lower) ||
    lower.includes('photo id') ||
    lower.includes('gov id') ||
    lower.includes('government id') ||
    lower.includes('id card') ||
    lower.includes('need id') ||
    lower.includes('require id') ||
    lower.includes('source for booking') ||
    lower.includes('booking source') ||
    lower.includes('need source') ||
    lower.includes('source') ||
    lower.includes('नागरिकता') ||
    lower.includes('पासपोर्ट') ||
    lower.includes('कागजात') ||
    lower.includes('पहचान पत्र')
  ) {
    return { intent: 'ID_REQUIREMENTS', confidence: 0.95, language, entities, reason: 'Guest inquiring about ID or booking documentation requirements.' };
  }

  // 4.6. How to book / Booking Process Inquiry
  if (
    lower.includes('how to book') ||
    lower.includes('how can i reserve') ||
    lower.includes('how do i book') ||
    lower.includes('booking process') ||
    lower.includes('procedure for booking') ||
    lower.includes('what do i need to book') ||
    lower.includes('where to book') ||
    lower.includes('how to reserve') ||
    lower.includes('कसरी बुक गर्ने') ||
    lower.includes('बुक कसरी गर्ने')
  ) {
    return { intent: 'BOOKING_INQUIRY', confidence: 0.95, language, entities, reason: 'Guest inquiring about how to book.' };
  }

  // 5. Booking Intent (Progressive)
  if (
    Boolean(entities.adults) ||
    entities.children !== undefined ||
    lower.match(/\b(we are|for|total|about)?\s*(\d+|one|two|three|four|five)\s*(adult|adults|guests?|people|persons?|child|children|kids?|jana|जना)\b/i) ||
    lower.match(/(need|want|looking for|require)\s+(a\s+|some\s+)?(room|rooms|bed|stay)/i) ||
    lower.match(/room.*(?:for\s+\d+\s*night)/i) ||
    lower.includes('book this room') ||
    lower.includes('reserve a room') ||
    lower.includes('make a reservation') ||
    lower.includes('need a room') ||
    lower.includes('need room') ||
    lower.includes('need some room') ||
    lower.includes('want a room') ||
    lower.includes('want room') ||
    lower.includes('looking for a room') ||
    lower.includes('send request') ||
    lower.includes('yes, send') ||
    lower.includes('बुक गर्न चाहन्छु') ||
    lower.includes('कोठा बुक') ||
    lower.includes('कोठा चाहियो') ||
    lower.includes('कोठा चाहिन्छ') ||
    lower.includes('बुक गर्न') ||
    lower.includes('बुक करना है') ||
    lower.match(/^(book|reserve|reservation|booking|confirm book|yes)$/i) ||
    (entities.checkIn && (lower.includes('room') || lower.includes('bed') || lower.includes('stay') || lower.includes('बस्न')))
  ) {
    return { intent: 'BOOKING', confidence: 0.98, language, entities, reason: 'High-intent booking request.' };
  }

  // 6. Room Availability
  if (
    lower.includes('availability') ||
    lower.includes('is available') ||
    lower.includes('are there rooms') ||
    lower.includes('have rooms') ||
    lower.includes('any vacancy') ||
    lower.includes('vacant') ||
    lower.includes('free room') ||
    lower.includes('check room availability') ||
    lower.includes('खाली छ') ||
    lower.includes('उपलब्ध')
  ) {
    return { intent: 'ROOM_AVAILABILITY', confidence: 0.95, language, entities };
  }

  // 6.5. Room Amenities / AC / Categories
  if (
    lower.includes('amenities') ||
    lower.includes('amenity') ||
    lower.includes('room amenities') ||
    lower.includes('room facilities') ||
    lower.includes('room types') ||
    lower.includes('room categories') ||
    lower.includes('room options') ||
    lower.includes('about the rooms') ||
    lower.includes('what is in the room') ||
    lower.includes('room features') ||
    lower.includes('air condition') ||
    lower.includes('air-condition') ||
    lower.includes('air conditioning') ||
    /\bac\b/i.test(lower) ||
    lower.includes('with ac') ||
    lower.includes('non ac') ||
    lower.includes('non-ac') ||
    lower.includes('fan') ||
    lower.includes('heater') ||
    lower.includes('hot shower') ||
    lower.includes('attached bathroom') ||
    lower.includes('कोठाको सुविधा') ||
    lower.includes('कोठामा के के छ') ||
    lower.includes('कोठामा के सुविधा') ||
    lower.includes('कोठाका प्रकार') ||
    lower.includes('एसी छ') ||
    lower.includes('ac छ') ||
    lower.includes('कोठामा एसी') ||
    lower.includes('फ्यान')
  ) {
    return { intent: 'ROOM_AMENITIES', confidence: 0.96, language, entities, reason: 'Guest inquiring about room amenities, AC, and categories.' };
  }

  // 7. Room Price / Rates
  if (
    lower.includes('price') ||
    lower.includes('cost') ||
    lower.includes('rate') ||
    lower.includes('how much') ||
    lower.includes('tariff') ||
    lower.includes('room prices') ||
    lower.includes('charge') ||
    lower.includes('कति पर्छ') ||
    lower.includes('मूल्य') ||
    lower.includes('भाडा') ||
    lower.includes('किराया')
  ) {
    return { intent: 'ROOM_PRICE', confidence: 0.95, language, entities };
  }

  // 8. Shared Kitchen / Long Stay
  if (
    lower.includes('kitchen') ||
    lower.includes('cook') ||
    lower.includes('cooking') ||
    lower.includes('stove') ||
    lower.includes('room 102') ||
    lower.includes('भान्सा') ||
    lower.includes('पकाउन')
  ) {
    return { intent: 'SHARED_KITCHEN', confidence: 0.95, language, entities };
  }

  if (
    lower.includes('long stay') ||
    lower.includes('monthly') ||
    lower.includes('two weeks') ||
    lower.includes('2 weeks') ||
    lower.includes('month stay')
  ) {
    return { intent: 'LONG_STAY', confidence: 0.92, language, entities };
  }

  // 9. Airport / Transportation
  if (
    lower.includes('airport') ||
    lower.includes('pickup') ||
    lower.includes('pick up') ||
    lower.includes('taxi') ||
    lower.includes('cab') ||
    lower.includes('transfer') ||
    lower.includes('विमानस्थल') ||
    lower.includes('ट्याक्सी')
  ) {
    return { intent: 'TRANSPORTATION', confidence: 0.95, language, entities };
  }

  // 10. Check-in / Check-out Times
  if (
    lower.includes('check-in') ||
    lower.includes('check in') ||
    lower.includes('check-out') ||
    lower.includes('check out') ||
    lower.includes('timing') ||
    lower.includes('early check') ||
    lower.includes('late check')
  ) {
    return { intent: 'CHECK_IN', confidence: 0.92, language, entities };
  }

  // 11. Location / Directions
  if (
    lower.includes('location') ||
    lower.includes('where are you') ||
    lower.includes('address') ||
    lower.includes('map') ||
    lower.includes('thamel') ||
    lower.includes('where is hotel') ||
    lower.includes('कहाँ छ') ||
    lower.includes('ठेगाना')
  ) {
    return { intent: 'LOCATION', confidence: 0.94, language, entities };
  }

  // 12. Facilities (Strict Anti-Hallucination checks for restaurant, parking, gym, pool)
  if (
    lower.includes('restaurant') ||
    lower.includes('food') ||
    lower.includes('breakfast') ||
    lower.includes('dining') ||
    lower.includes('parking') ||
    lower.includes('pool') ||
    lower.includes('gym') ||
    lower.includes('facilities') ||
    lower.includes('amenities') ||
    lower.includes('wifi') ||
    lower.includes('hot water') ||
    lower.includes('सुविधा') ||
    lower.includes('खाना')
  ) {
    return { intent: 'FACILITIES', confidence: 0.95, language, entities };
  }

  // 13. Policy / Noise
  if (
    lower.includes('quiet') ||
    lower.includes('noise') ||
    lower.includes('peaceful') ||
    lower.includes('policy') ||
    lower.includes('rules') ||
    lower.includes('smoking') ||
    lower.includes('pet')
  ) {
    return { intent: 'POLICY', confidence: 0.90, language, entities };
  }

  // 14. Hotel Information
  if (
    lower.includes('hotel information') ||
    lower.includes('about hotel') ||
    lower.includes('hotel info') ||
    lower.includes('tell me about') ||
    lower.includes('होटलको बारेमा')
  ) {
    return { intent: 'HOTEL_INFORMATION', confidence: 0.90, language, entities };
  }

  // 15. Greetings
  if (
    lower.startsWith('hi') ||
    lower.startsWith('hello') ||
    lower.startsWith('hey') ||
    lower.includes('good morning') ||
    lower.includes('good afternoon') ||
    lower.includes('good evening') ||
    lower === 'hi' ||
    lower === 'hello' ||
    lower.includes('नमस्ते') ||
    lower.includes('नमस्कार')
  ) {
    return { intent: 'GREETING', confidence: 0.98, language, entities };
  }

  // If dates are provided alone
  if (entities.checkIn) {
    return { intent: 'ROOM_AVAILABILITY', confidence: 0.85, language, entities };
  }

  return { intent: 'OTHER', confidence: 0.60, language, entities };
}
