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

// Entity extraction from free text
export function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = {};
  const lower = text.toLowerCase();

  // Adults extraction
  const adultsMatch =
    lower.match(/(\d+)\s*(adult|adults|grown|people|person|persons|guests?|jana|जना)/i) ||
    lower.match(/(two|three|four|one|1|2|3|4)\s*(adult|adults|guests?|people)/i);
  if (adultsMatch) {
    const wordToNum: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
    const val = wordToNum[adultsMatch[1].toLowerCase()] ?? parseInt(adultsMatch[1], 10);
    if (!isNaN(val)) entities.adults = val;
  }

  // Children extraction
  const childMatch = lower.match(/(\d+)\s*(child|children|kid|kids|bachha|बच्चा)/i);
  if (childMatch) {
    const val = parseInt(childMatch[1], 10);
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

  // Date ranges extraction (e.g., "12 to 15 oct", "oct 12 - oct 15", "12th oct - 15th oct", "from 10 oct to 14 oct")
  const dateRangePattern =
    /(?:from\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s*(?:to|-|until|till)\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i;
  
  const rangeMatch = lower.match(dateRangePattern);
  if (rangeMatch) {
    entities.checkIn = rangeMatch[1].trim();
    entities.checkOut = rangeMatch[2].trim();
  } else {
    // Single date mentioned
    const singleDate = lower.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{4})?)/i);
    if (singleDate) {
      entities.checkIn = singleDate[1].trim();
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
    lower.includes('pay ') ||
    lower.includes('credit card') ||
    lower.includes('cash') ||
    lower.includes('deposit') ||
    lower.includes('advance payment') ||
    lower.includes('भुक्तानी')
  ) {
    return { intent: 'PAYMENT', confidence: 0.90, language, entities };
  }

  // 5. Booking Intent (Progressive)
  if (
    lower.includes('book') ||
    lower.includes('reservation') ||
    lower.includes('reserve') ||
    lower.match(/(need|want|looking for|require)\s+(a\s+|some\s+)?(room|rooms|bed|stay)/i) ||
    lower.match(/room.*(?:for\s+\d+\s*night)/i) ||
    lower.includes('how to book') ||
    lower.includes('how can i reserve') ||
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
    lower.includes('बुक करना है') ||
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
