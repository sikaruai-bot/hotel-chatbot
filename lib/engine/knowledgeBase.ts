import { prisma } from '../prisma';

export interface GroundedKnowledge {
  roomPrices: {
    deluxe: number;
    budgetFamily: number;
    family: number;
  };
  hotelInfo: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
  };
  bookingLinks: Record<string, string>;
}

// Fetch live rates and hotel facts from Database
export async function getGroundedKnowledge(): Promise<GroundedKnowledge> {
  try {
    const roomTypes = await prisma.roomType.findMany({
      where: { isActive: true },
    });

    const rates = {
      deluxe: 20,
      budgetFamily: 20,
      family: 30,
    };

    roomTypes.forEach((rt) => {
      if (rt.code === 'DELUXE') rates.deluxe = rt.basePriceUsd;
      if (rt.code === 'BUDGET_FAMILY') rates.budgetFamily = rt.basePriceUsd;
      if (rt.code === 'FAMILY') rates.family = rt.basePriceUsd;
    });

    const settings = await prisma.hotelSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      roomPrices: rates,
      hotelInfo: {
        name: settingsMap['hotel_name'] || 'Hotel Sherpa Soul',
        tagline: settingsMap['hotel_tagline'] || 'No Restaurant. No Noise. Sleep Well.',
        address: settingsMap['hotel_address'] || '26 Thamel Bhagwati Marg, Kathmandu 44600, Nepal',
        phone: settingsMap['hotel_phone'] || '+977-1-4530311',
        whatsapp: settingsMap['hotel_whatsapp'] || '+977-9818259472',
        email: settingsMap['hotel_email'] || 'info@hotelsherpasoul.com',
      },
      bookingLinks: {
        direct: settingsMap['booking_direct_url'] || 'https://www.hotelsherpasoul.com',
        whatsapp: settingsMap['whatsapp_direct_url'] || 'https://wa.me/9779818259472',
        bookingCom: settingsMap['booking_com_url'] || '',
        agoda: settingsMap['agoda_url'] || '',
      },
    };
  } catch (error) {
    console.error('Error fetching grounded knowledge:', error);
    return {
      roomPrices: { deluxe: 20, budgetFamily: 20, family: 30 },
      hotelInfo: {
        name: 'Hotel Sherpa Soul',
        tagline: 'No Restaurant. No Noise. Sleep Well.',
        address: '26 Thamel Bhagwati Marg, Kathmandu 44600, Nepal',
        phone: '+977-1-4530311',
        whatsapp: '+977-9818259472',
        email: 'info@hotelsherpasoul.com',
      },
      bookingLinks: { direct: 'https://www.hotelsherpasoul.com' },
    };
  }
}

export interface WebsiteKnowledgeItem {
  id: string;
  category: string;
  keywords: string[];
  answerEn: string;
  answerNe: string;
  answerHi?: string;
}

export const HOTEL_WEBSITE_KNOWLEDGE: WebsiteKnowledgeItem[] = [
  {
    id: 'luggage_storage',
    category: 'LUGGAGE',
    keywords: [
      'luggage', 'storage', 'store bag', 'bags', 'baggage', 'keep bag', 'trek luggage',
      'hold luggage', 'safe storage', 'trek storage', 'leave luggage', 'keep luggage',
      'लगेज', 'सामान', 'झोला', 'राख्न', 'राख्ने', 'लगेज राख्ने', 'सामान राख्ने', 'झोला राख्ने',
      'luggage rakhne', 'bag rakhne', 'saman rakhne'
    ],
    answerEn: "Yes! Hotel Sherpa Soul offers complimentary secure luggage storage for all our guests 😊\n\nYou can safely store your luggage with our 24/7 front desk:\n• Before check-in or after check-out\n• During multi-day Himalayan treks (Everest Base Camp, Annapurna, Langtang, etc.) until you return\n\nYour bags will be tagged and kept in a secure holding area completely free of charge!",
    answerNe: "हजुर! होटल शेर्पा सोलमा हाम्रा पाहुनाहरूका लागि निःशुल्क र सुरक्षित लगेज भण्डारण (Luggage Storage) सुविधा उपलब्ध छ 😊\n\nयहाँले:\n• चेक-इन अघि वा चेक-आउट पछि\n• सगरमाथा (Everest), अन्नपूर्ण (Annapurna), वा लाङटाङ (Langtang) जस्ता बहु-दिने हिमाली ट्रेकिङमा जाँदा\nआफ्नो ठूला झोला वा सामान हाम्रो २४ सै घण्टा खुला रहने फ्रन्ट डेस्कमा सुरक्षित राखेर ट्रेकिङबाट फर्केपछि लिन सक्नुहुन्छ। यो सेवा हाम्रा पाहुनाका लागि बिल्कुल निःशुल्क छ!",
    answerHi: "हाँ! होटल शेरपा सोल में हमारे सभी मेहमानों के लिए मुफ्त और सुरक्षित लगेज स्टोरेज (सामान रखने) की सुविधा उपलब्ध है 😊\n\nआप चेक-इन से पहले, चेक-आउट के बाद या हिमालयन ट्रेकिंग (एवरेस्ट, अन्नपूर्णा) के दौरान अपना सामान हमारे 24/7 फ्रंट डेस्क पर बिल्कुल मुफ्त और सुरक्षित रख सकते हैं!"
  },
  {
    id: 'trekking_tours_guides',
    category: 'TREKKING',
    keywords: [
      'trek', 'trekking', 'permit', 'permits', 'guide', 'sherpa', 'everest', 'annapurna',
      'langtang', 'lukla', 'flight', 'flights', 'tour', 'sightseeing', 'hiking', 'himalaya',
      'tims', 'acap', 'sagarmatha', 'porter', 'ट्रेकिङ', 'गाइड', 'पर्मिट', 'अनुमतिपत्र',
      'सगरमाथा', 'लुक्ला', 'अन्नपूर्ण', 'उडान', 'टुर', 'ट्रेकिङ गाइड', 'trek guide', 'trek permit'
    ],
    answerEn: "Yes! Drawing from our authentic Sherpa mountain heritage, Hotel Sherpa Soul provides complete travel and trekking desk support right from our front desk 😊\n\nWe can arrange:\n• Trekking permits (TIMS Card, Sagarmatha National Park, Annapurna ACAP)\n• Certified, licensed Sherpa trekking guides and porters\n• Domestic mountain flights (Kathmandu–Lukla, Pokhara, etc.)\n• Kathmandu Valley cultural sightseeing tours\n\nFeel free to speak directly with our front desk or message us on WhatsApp at +977-9851068219 for personalized trek planning!",
    answerNe: "हजुर! हाम्रो आफ्नै शेर्पा परम्परा र अनुभवका साथ होटल शेर्पा सोलले ट्रेकिङ र यात्रा सम्बन्धी सम्पूर्ण सेवा उपलब्ध गराउँछ 😊\n\nहामी मार्फत:\n• ट्रेकिङ अनुमतिपत्रहरू (TIMS, सगरमाथा राष्ट्रिय निकुञ्ज, अन्नपूर्ण ACAP Permits)\n• लाइसेन्सप्राप्त अनुभवी शेर्पा ट्रेकिङ गाइड तथा पोर्टर\n• आन्तरिक हवाई टिकट (लुक्ला, पोखरा उडानहरू)\n• काठमाडौँ उपत्यका दृश्यावलोकन (Sightseeing) टुरहरू\nसजिलै व्यवस्था गर्न सकिन्छ। थप जानकारीका लागि हाम्रो फ्रन्ट डेस्क वा सिधै ह्वाट्सएप (+९७७ ९८५१०६८२१९) मा सम्पर्क गर्न सक्नुहुन्छ!",
    answerHi: "हाँ! हमारी प्रामाणिक शेरपा विरासत के साथ, होटल शेरपा सोल आपके लिए ट्रेकिंग परमिट (TIMS, एवरेस्ट, अन्नपूर्णा), प्रमाणित शेरपा गाइड, घरेलू उड़ानें (लुक्ला, पोखरा) और काठमांडू वैली टूर की पूरी व्यवस्था करता है 😊"
  },
  {
    id: 'rooftop_terrace',
    category: 'ROOFTOP',
    keywords: [
      'rooftop', 'terrace', 'roof', 'view', 'valley view', 'mountain view', 'city view',
      'sun terrace', 'छत', 'रुफटप', 'दृश्य', 'भ्यू', 'rooftop terrace'
    ],
    answerEn: "Yes! Hotel Sherpa Soul features an open rooftop terrace with panoramic views of the Kathmandu valley and surrounding hills 😊\n\nIt is a peaceful haven where you can relax with fresh Himalayan tea, catch morning sunlight, soak in the mountain breeze, or read a book away from the city buzz. Free high-speed Wi-Fi is also available on the rooftop!",
    answerNe: "हजुर! होटल शेर्पा सोलमा शान्त र खुला रुफटप टेरेस (Rooftop Terrace) उपलब्ध छ 😊\n\nयहाँबाट काठमाडौँ उपत्यका र वरपरका हरिया डाँडाहरूको मनोरम दृश्य हेर्दै ताजा हिमाली चिया पिउन, बिहानको घाम ताप्न वा शान्त वातावरणमा पुस्तक पढ्न सकिन्छ। रुफटपमा पनि द्रुत गतिको वाइफाइ चल्दछ!",
    answerHi: "हाँ! होटल शेरपा सोल में एक खुला रूफटॉप टेरेस है जहाँ से काठमांडू घाटी और पहाड़ियों के सुंदर दृश्य दिखाई देते हैं 😊 आप यहाँ चाय का आनंद ले सकते हैं और शांत वातावरण में आराम कर सकते हैं।"
  },
  {
    id: 'hot_water_power_backup',
    category: 'HOT_WATER',
    keywords: [
      'hot water', 'shower', 'hot shower', '24/7 hot', 'solar', 'power backup', 'electricity',
      'generator', 'load shedding', 'power cut', 'तातो पानी', 'धारा', 'नुहाउने', 'बिजुली',
      'बत्ती', 'ब्याकअप', 'लोडसेडिङ', 'tato pani', 'pani tato'
    ],
    answerEn: "Yes! All rooms at Hotel Sherpa Soul feature 24/7 high-pressure hot water showers in private attached bathrooms, powered by solar heating with electric backup 😊\n\nWe also maintain a reliable power backup system, ensuring that lighting, charging outlets, and fiber Wi-Fi remain active even during city power cuts. Perfect for warming up after arriving from a long mountain trek!",
    answerNe: "हजुर! होटल शेर्पा सोलका प्रत्येक कोठाको निजी बाथरुममा २४ सै घण्टा उच्च प्रेसरको तातो पानी (24/7 Hot Shower) उपलब्ध छ 😊 यो सोलार प्रणाली र विद्युतीय ब्याकअपबाट सञ्चालित छ।\n\nसाथै, लोडसेडिङ वा बत्ती जाँदा पनि निर्बाध बत्ती, चार्जिङ र वाइफाइ चल्ने गरी भरपर्दो पावर ब्याकअपको व्यवस्था छ। ट्रेकिङबाट फर्केपछि वा थकाइ मेटाउन तातो पानीको कुनै कमी हुँदैन!",
    answerHi: "हाँ! होटल शेरपा सोल के सभी कमरों में 24/7 गर्म पानी का शावर और बिजली कटने पर विश्वसनीय पावर बैकअप की सुविधा उपलब्ध है 😊"
  },
  {
    id: 'wifi_internet',
    category: 'WIFI',
    keywords: [
      'wifi', 'wi-fi', 'internet', 'speed', 'fiber', 'work', 'zoom', 'connection',
      'वाइफाइ', 'इन्टरनेट', 'नेट', 'fiber wifi'
    ],
    answerEn: "Yes! We provide complimentary high-speed fiber-optic Wi-Fi throughout Hotel Sherpa Soul — covering all guest rooms, the rooftop terrace, and the reception lobby 😊\n\nThe connection is fast and reliable for video calls, remote work, streaming, and staying in touch with friends and family.",
    answerNe: "हजुर! होटल शेर्पा सोलका सम्पूर्ण कोठाहरू, रुफटप टेरेस र लबीमा निःशुल्क द्रुत गतिको फाइबर-अप्टिक वाइफाइ (High-speed Fiber Wi-Fi) उपलब्ध छ 😊\n\nयो जुम/भिडियो कल, अनलाइन काम (Remote work) र इन्टरनेट चलाउन एकदमै द्रुत र भरपर्दो छ।",
    answerHi: "हाँ! होटल के सभी कमरों, रूफटॉप और लॉबी में मुफ्त हाई-स्पीड फाइबर वाई-फाई उपलब्ध है 😊"
  },
  {
    id: 'airport_transfers',
    category: 'TRANSPORTATION',
    keywords: [
      'airport', 'pickup', 'drop', 'shuttle', 'transfer', 'cab', 'taxi', 'tribhuvan',
      'tia', 'ktm airport', 'विमानस्थल', 'एयरपोर्ट', 'पिकअप', 'ट्याक्सी', 'airport pickup', 'airport transfer'
    ],
    answerEn: "Yes! We arrange reliable private airport pick-up and drop-off transfers to and from Tribhuvan International Airport (TIA/KTM), which is about 6 km (~20-30 minutes) from our hotel 😊\n\nTo arrange an airport transfer, you can request it during booking or message our front desk on WhatsApp at +977-9851068219 with your flight number and arrival time. A trusted driver will meet you right outside the airport arrivals terminal!",
    answerNe: "हजुर! हामी त्रिभुवन अन्तर्राष्ट्रिय विमानस्थल (TIA) बाट होटलसम्म भरपर्दो एयरपोर्ट पिकअप र ड्रप (Airport Transfer) सेवा व्यवस्था गर्दछौँ। होटल विमानस्थलबाट करिब ६ कि.मि. (२०-३० मिनेट) दूरीमा छ 😊\n\nगाडी मगाउनका लागि यहाँले बुकिङ गर्दा वा हाम्रो फ्रन्ट डेस्कको ह्वाट्सएप (+९७७ ९८५१०६८२१९) मा आफ्नो उडान नम्बर (Flight Number) र आगमन समय पठाउन सक्नुहुन्छ। चालकले विमानस्थलमै यहाँलाई स्वागत गर्नेछन्!",
    answerHi: "हाँ! हम त्रिभुवन अंतर्राष्ट्रीय हवाई अड्डे (TIA) से होटल तक विश्वसनीय एयरपोर्ट पिकअप और ड्रॉप की व्यवस्था करते हैं। आप व्हाट्सएप पर (+977-9851068219) अपनी फ्लाइट विवरण भेजकर टैक्सी बुक कर सकते हैं 😊"
  },
  {
    id: 'location_surroundings',
    category: 'LOCATION',
    keywords: [
      'location', 'address', 'where', 'distance', 'far', 'garden of dreams', 'durbar square',
      'swayambhu', 'monkey temple', 'walking distance', 'map', 'alley', 'quiet',
      'ठेगाना', 'कहाँ छ', 'कति टाढा', 'स्थान', 'नजिक', 'hotel location', 'hotel address',
      'thamel', 'thamel ma', 'kata chha', 'kata cha', 'kata ho', 'hotel kata'
    ],
    answerEn: "Hotel Sherpa Soul is located at 26 Thamel Bhagwati Marg, Thamel, Kathmandu 44600, Nepal 😊\n\nWe are situated in a quiet alley right in the heart of central Thamel, away from street noise. Key walking and driving distances:\n• Garden of Dreams: 7 minutes walk (~500m)\n• Kathmandu Durbar Square: 20 minutes walk (~1.5 km)\n• Swayambhunath (Monkey Temple): ~3 km (10-15 mins by taxi)\n• Tribhuvan International Airport (KTM): ~6 km (20-30 mins by taxi)\n\nDozens of famous cafes, ATMs, gear shops, and currency exchanges are just 1-2 minutes walk away!",
    answerNe: "होटल शेर्पा सोल ठमेलको केन्द्र, २६ ठमेल भगवती मार्ग, काठमाडौँ ४४६०० मा अवस्थित छ 😊\n\nयो मुख्य सडकको कोलाहलबाट थोरै भित्र शान्त गल्लीमा रहेकाले कोठाहरू शान्त र आरामदायी छन्:\n• गार्डन अफ ड्रिम्स (Garden of Dreams): ७ मिनेट हिँडाइ (~५०० मिटर)\n• काठमाडौँ दरबार स्क्वायर: २० मिनेट हिँडाइ (~१.५ कि.मि.)\n• स्वयम्भुनाथ (Monkey Temple): करिब ३ कि.मि. (ट्याक्सीमा १० मिनेट)\n• त्रिभुवन अन्तर्राष्ट्रिय विमानस्थल: करिब ६ कि.मि. (ट्याक्सीमा २०-३० मिनेट)\n\nवरपर एटीएम, बैंक, ट्रेकिङ पसल र क्याफेहरू १-२ मिनेटमै पुग्न सकिन्छ!",
    answerHi: "होटल शेरपा सोल 26 थमेल भगवती मार्ग, काठमांडू में स्थित है। यह थमेल के केंद्र में एक शांत गली में है, जहाँ से गार्डन ऑफ ड्रीम्स 7 मिनट और दरबार स्क्वायर 20 मिनट की पैदल दूरी पर है 😊"
  },
  {
    id: 'restaurant_dining_policy',
    category: 'FACILITIES',
    keywords: [
      'restaurant', 'food', 'breakfast', 'dining', 'lunch', 'dinner', 'eat', 'meal',
      'cafe', 'bakery', 'khana', 'khaja', 'खाना', 'खाजा', 'रेस्टुरेन्ट', 'बिहानको खाना', 'डिनर'
    ],
    answerEn: "Our brand philosophy is 'No Restaurant. No Noise. Sleep Well.' 😊\n\nWe intentionally do NOT operate an on-site commercial bar or restaurant so our rooms stay completely quiet, calm, and free of kitchen odors or late-night noise. However:\n• Dozens of top bakeries, authentic Nepali/Newari restaurants, Italian, Indian, and Western cafes are just 1-2 minutes walk right outside our doors.\n• For guests staying 2+ weeks (14 nights), we provide Room 102 as a fully equipped Shared Kitchen completely FREE of charge!",
    answerNe: "हाम्रो आदर्श वाक्य 'No Restaurant. No Noise. Sleep Well.' हो 😊\n\nहोटल भित्र होहल्ला र गन्ध नहोस् तथा पाहुनाहरूले शान्त निद्रा पाऊन् भनेर हामीले होटल भित्र व्यावसायिक रेस्टुरेन्ट राखेका छैनौँ। तर:\n• होटलको १-२ मिनेटको दूरीमा थुप्रै उत्कृष्ट बेकरी, नेपाली तथा नेवारी खाजा घर, कफी सप र अन्तर्राष्ट्रिय रेस्टुरेन्टहरू छन्।\n• साथै २ हप्ता (१४ दिन) वा सोभन्दा बढी बस्ने पाहुनाका लागि कोठा १०२ मा निःशुल्क साझा भान्सा (Shared Kitchen) उपलब्ध छ!",
    answerHi: "होटल शेरपा सोल 'No Restaurant. No Noise. Sleep Well.' के सिद्धांत पर चलता है। होटल में कोई शोर वाला रेस्टोरेंट नहीं है ताकि आपको शांतिपूर्ण नींद मिल सके। बाहर 1-2 मिनट की पैदल दूरी पर कई बेहतरीन रेस्टोरेंट और कैफे हैं 😊"
  },
  {
    id: 'room_amenities_categories',
    category: 'ROOM_AMENITIES',
    keywords: [
      'amenities', 'room types', 'difference', 'ac', 'air condition', 'air conditioning',
      'budget', 'fan', 'deluxe', 'family', 'budget family', 'bathroom', 'attached bath',
      'सुविधा', 'एसी', 'कोठा', 'फरक', 'बाथरुम', 'room difference', 'room amenities'
    ],
    answerEn: "Hotel Sherpa Soul offers 3 distinct room categories 😊:\n\n1. 🏨 Deluxe Room (Starting USD 20/night):\n• Equipped with Air Conditioning (AC)\n• Private attached modern bathroom with 24/7 hot shower\n• Comfortable Queen bed, seating area, fast Wi-Fi, quiet sleep (up to 2 adults + 1 child)\n\n2. 👨‍👩‍👧 Family Room (Starting USD 30/night):\n• Equipped with Air Conditioning (AC)\n• Spacious layout with King bed + Single bed (up to 3 adults + 1 child)\n• Private modern bathroom, 24/7 hot shower, high-speed Wi-Fi\n\n3. 🌿 Budget Family Room (Starting USD 20/night):\n• Non-AC (equipped with high-speed fan)\n• King bed + Single bed (up to 3 adults + 1 child)\n• Note: Aside from AC, ALL OTHER AMENITIES (private attached bath, 24/7 hot shower, high-speed fiber Wi-Fi, comfortable beds) are identical to our Deluxe and Family rooms!\n\n✨ Long-Stay Special: Stays of 2+ weeks (14 nights) get FREE access to our fully equipped Shared Kitchen (Room 102)!",
    answerNe: "होटल शेर्पा सोलका कोठाका प्रकार र उपलब्ध सुविधाहरू यस प्रकार छन् 😊:\n\n१. 🏨 डिलक्स कोठा (Deluxe Room — सुरुवाती USD 20/रात):\n• एयर कन्डिसनिङ (AC) सहित\n• २४ सै घण्टा तातो पानीसहितको निजी आधुनिक बाथरुम\n• किङ बेड, बस्ने सोफा, द्रुत वाइफाइ र शान्त वातावरण (२ वयस्क + १ बच्चा सम्म)\n\n२. 👨‍👩‍👧 फेमिली कोठा (Family Room — सुरुवाती USD 30/रात):\n• एयर कन्डिसनिङ (AC) सहितको फराकिलो कोठा\n• किङ बेड + १ सिंगल बेड, निजी बाथरुम र द्रुत वाइफाइ (३ वयस्क + १ बच्चा सम्म)\n\n३. 🌿 बजेट फेमिली कोठा (Budget Family Room — सुरुवाती USD 20/रात):\n• Non-AC (एसी छैन, फ्यानको राम्रो व्यवस्था छ)\n• किङ बेड + १ सिंगल बेड (३ वयस्क + १ बच्चा सम्म)\n• ध्यान दिनुहोस्: एसी बाहेक अरू सबै सुविधा (निजी बाथरुम, २४ सै घण्टा तातो पानी, द्रुत वाइफाइ, सफा ओछ्यान) डिलक्स र फेमिली सरह समान छन्!\n\n✨ लामो बसाइका लागि उपहार: २ हप्ता वा सोभन्दा बढी बस्ने पाहुनाका लागि कोठा १०२ मा पूर्ण सुविधायुक्त साझा भान्सा (Shared Kitchen) बिल्कुल निःशुल्क उपलब्ध छ!",
    answerHi: "होटल शेरपा सोल में 3 प्रकार के कमरे हैं: डीलक्स रूम (AC सहित - $20), फैमिली रूम (AC सहित बड़ा कमरा - $30), और बजट फैमिली रूम (Non-AC फैन सहित, बाकी सभी सुविधाएं समान - $20) 😊"
  },
  {
    id: 'shared_kitchen_long_stay',
    category: 'SHARED_KITCHEN',
    keywords: [
      'kitchen', 'cook', 'cooking', 'self kitchen', 'shared kitchen', 'room 102',
      'fridge', 'microwave', 'oven', 'stove', 'bhanse', 'bhansha', 'भान्सा', 'पकाउने', 'किचन', 'लामो बसाइ'
    ],
    answerEn: "For guests staying for 2 weeks (14 nights) or more, Hotel Sherpa Soul provides Room 102 as a fully equipped Shared Kitchen completely FREE of charge 😊!\n\nThe kitchen is equipped with:\n• 2 mini fridges\n• 1 microwave/oven\n• 2 storage racks\n• 2 dining tables & 4 chairs\n• Wash basin and waste management\n\nYou can comfortably prepare your personal diet, cook meals, and brew fresh tea. Please note this is for long-stay self-cooking, not a public restaurant.",
    answerNe: "हाम्रो होटलमा २ हप्ता (१४ दिन) वा सोभन्दा बढी बस्ने पाहुनाहरूका लागि कोठा १०२ (Room 102) मा पूर्ण सुविधायुक्त साझा भान्सा (Shared Kitchen) बिल्कुल निःशुल्क (FREE) उपलब्ध छ 😊\n\nयसमा २ वटा मिनी फ्रिज, १ ओभन, २ र्‍याक, २ टेबल, ४ कुर्सी र पानीको बेसिन उपलब्ध छन्। पाहुनाहरूले आफ्नै व्यक्तिगत खाना र हिमाली चिया आफैँ पकाएर आनन्द लिन सक्नुहुन्छ।",
    answerHi: "2 सप्ताह या अधिक रुकने वाले मेहमानों के लिए हम कमरा 102 में पूरी तरह सुसज्जित शेयर्ड किचन बिल्कुल मुफ़्त उपलब्ध कराते हैं! इसमें फ्रिज, माइक्रोवेव, टेबल, कुर्सियां और खाना पकाने की पूरी सुविधा है 😊"
  },
  {
    id: 'payment_and_discount',
    category: 'PAYMENT',
    keywords: [
      'discount', '10%', 'offer', 'deal', 'payment', 'pay', 'credit card', 'visa',
      'mastercard', 'cash', 'fonepay', 'esewa', 'deposit', 'advance', 'currency', 'currencies',
      'छुट', 'भुक्तानी', 'पैसा', 'कार्ड', 'नगद', '१०%'
    ],
    answerEn: "When booking directly with Hotel Sherpa Soul, you receive an instant 10% discount on all room rates 😊!\n\n• No advance deposit or credit card pre-authorization is required online.\n• Payment is made comfortably at check-in upon arrival.\n• Accepted payment methods: Cash (NPR, USD, EUR), Credit/Debit Cards (Visa, MasterCard), Fonepay QR, and direct bank transfers.",
    answerNe: "होटल शेर्पा सोलमा सिधै बुक गर्दा यहाँले सबै कोठामा तुरुन्त १०% छुट (Direct Booking Discount) पाउनुहुन्छ 😊!\n\n• अनलाइन बुक गर्दा कुनै पनि अग्रिम रकम (Advance / Deposit) तिर्नु पर्दैन।\n• भुक्तानी होटल चेक-इनको समयमा गरे पुग्छ।\n• स्वीकृत भुक्तानी माध्यमहरू: नगद (NPR, USD, EUR), क्रेडिट/डेबिट कार्ड (Visa, MasterCard), फोनपे (Fonepay) / eSewa QR, र बैंक ट्रान्सफर।",
    answerHi: "होटल शेरपा सोल में सीधे बुकिंग करने पर 10% की तत्काल छूट मिलती है! कोई अग्रिम भुगतान की आवश्यकता नहीं है, आप चेक-इन के समय नकद, कार्ड या क्यूआर से भुगतान कर सकते हैं 😊"
  },
  {
    id: 'checkin_checkout_hours',
    category: 'CHECK_IN',
    keywords: [
      'check-in', 'check in', 'check-out', 'check out', 'reception', 'front desk', 'open',
      'hours', 'early check in', 'late check out', 'timing', '24/7', 'समय', 'चेक इन', 'चेक आउट', 'रिसेप्सन'
    ],
    answerEn: "Our front desk is open 24 hours a day, 7 days a week 😊\n\n• Check-in time: from 14:00 (2:00 PM)\n• Check-out time: until 12:00 (12:00 PM noon)\n• Early check-in & late check-out: available upon request subject to room availability on the day.\n• Arriving early? You are welcome to store your luggage with us completely free of charge!",
    answerNe: "हाम्रो फ्रन्ट डेस्क २४ सै घण्टा खुला रहन्छ 😊\n\n• चेक-इन समय: दिउँसो २:०० बजे (14:00) देखि\n• चेक-आउट समय: मध्यान्ह १२:०० बजे (12:00) सम्म\n• अर्ली चेक-इन वा लेट चेक-आउट: कोठा खाली भएको खण्डमा उपलब्ध गराइन्छ।\n• यदि यहाँ चाँडै आइपुग्नुभयो भने आफ्नो सामान फ्रन्ट डेस्कमा निःशुल्क राखेर घुम्न निस्कन सक्नुहुन्छ!",
    answerHi: "हमारा फ्रंट डेस्क 24 घंटे खुला रहता है। चेक-इन दोपहर 2:00 बजे से और चेक-आउट दोपहर 12:00 बजे तक है। उपलब्धता के अनुसार जल्दी चेक-इन और मुफ्त लगेज स्टोरेज उपलब्ध है 😊"
  },
  {
    id: 'hotel_policies',
    category: 'POLICY',
    keywords: [
      'policy', 'rules', 'smoking', 'smoke', 'pet', 'pets', 'dog', 'cat', 'quiet hours',
      'child policy', 'children', 'नियम', 'धूम्रपान', 'शान्त', 'बच्चा'
    ],
    answerEn: "Hotel Sherpa Soul follows clear guidelines for peaceful and clean stays 😊:\n• Non-Smoking: 100% smoke-free inside all guest rooms and corridors.\n• Pets: Pets are not permitted on the property.\n• Quiet Hours: Strictly observed from 10:00 PM to 7:00 AM for deep, restful sleep.\n• Children: Children under 12 stay free when sharing existing bedding with parents.",
    answerNe: "होटल शेर्पा सोलका मुख्य नीति तथा नियमहरू 😊:\n• धूम्रपान: सबै कोठाहरू पूर्ण रूपमा धूम्रपानरहित (Non-smoking) छन्।\n• पाल्तु जनावर: पाल्तु जनावर ल्याउन निषेध छ।\n• शान्त समय: राति १०:०० बजे देखि बिहान ७:०० बजे सम्म शान्त समय (Quiet Hours) लागू हुन्छ।\n• बालबालिका: १२ वर्ष मुनिका बालबालिका बाबुआमासँग एउटै ओछ्यानमा निःशुल्क बस्न सक्छन्।",
    answerHi: "होटल के नियम: सभी कमरों में धूम्रपान निषेध है, पालतू जानवरों की अनुमति नहीं है, और रात 10:00 बजे से सुबह 7:00 बजे तक शांत समय रहता है 😊"
  },
  {
    id: 'safety_and_security',
    category: 'SAFETY',
    keywords: [
      'safe', 'safety', 'security', 'solo traveler', 'female traveler', 'safe for women',
      'cctv', 'सुरक्षा', 'सुरक्षित', 'महिला'
    ],
    answerEn: "Hotel Sherpa Soul is exceptionally safe and welcoming for solo travelers, female travelers, and families 😊\n\n• 24/7 staffed reception desk\n• CCTV surveillance in public corridors and entrances\n• Secure locks on all rooms\n• Friendly, trusted Sherpa family hospitality where guest safety and peace of mind are always our highest priority!",
    answerNe: "होटल शेर्पा सोल सोलो ट्राभलर, महिला पाहुना र परिवारका लागि अत्यन्त सुरक्षित र भरपर्दो छ 😊\n\n• २४ सै घण्टा कर्मचारीसहितको फ्रन्ट डेस्क\n• सार्वजनिक स्थान र प्रवेशद्वारमा सीसीटीभी निगरानी\n• सबै कोठामा सुरक्षित लक\n• शेर्पा परिवारको हार्दिक र सुरक्षित आतिथ्यता!",
    answerHi: "होटल शेरपा सोल सोलो यात्रियों, महिला यात्रियों और परिवारों के लिए पूरी तरह सुरक्षित है। 24 घंटे स्टाफ और सीसीटीवी निगरानी उपलब्ध है 😊"
  },
  {
    id: 'laundry_service',
    category: 'FACILITIES',
    keywords: [
      'laundry', 'wash clothes', 'washing', 'dry clean', 'ironing', 'लन्ड्री', 'कपडा धुने', 'लुगा धुने'
    ],
    answerEn: "Yes! Hotel Sherpa Soul provides prompt and affordable laundry service with same-day or next-day return 😊 Perfect for washing trail clothes after returning from Himalayan treks. Just inform our front desk!",
    answerNe: "हजुर! होटल शेर्पा सोलमा छिटो र सस्तो दरमा लन्ड्री (कपडा धुने) सेवा उपलब्ध छ 😊 ट्रेकिङबाट फर्केपछि लुगा धुनका लागि यो एकदमै उपयोगी छ। फ्रन्ट डेस्कमा दिनुभएमा सोही दिन वा भोलिपल्ट सफा लुगा प्राप्त हुन्छ!",
    answerHi: "हाँ! हम किफायती दरों पर त्वरित कपड़े धोने (लॉन्ड्री) की सेवा प्रदान करते हैं 😊"
  },
  {
    id: 'hotel_about_contact',
    category: 'HOTEL_INFORMATION',
    keywords: [
      'about', 'story', 'who are you', 'hotel info', 'sherpa soul', 'philosophy',
      'contact', 'phone', 'whatsapp', 'email', 'होटलको बारेमा', 'परिचय', 'सम्पर्क'
    ],
    answerEn: "Hotel Sherpa Soul is a tranquil boutique hotel located at 26 Thamel Bhagwati Marg, Kathmandu, inspired by authentic Himalayan Sherpa hospitality 😊\n\n• Motto: 'No Restaurant. No Noise. Sleep Well.'\n• WhatsApp Chatbot: +977-9818259472 (wa.me/9779818259472)\n• Front Desk / Call: +977-1-4530311 / +977-9851068219\n• Email: info@hotelsherpasoul.com\n• Website: https://hotelsherpasoul.com\n• 24/7 Reception Desk\n\nWe provide clean restful rooms, 24/7 hot showers, high-speed fiber Wi-Fi, and licensed trekking guidance!",
    answerNe: "होटल शेर्पा सोल ठमेल भगवती मार्ग २६, काठमाडौँमा अवस्थित एक शान्त र आरामदायी बुटिक होटल हो 😊\n\n• आदर्श वाक्य: 'No Restaurant. No Noise. Sleep Well.'\n• ह्वाट्सएप च्याटबोट: +९७७ ९८१८२५९४७२ (wa.me/9779818259472)\n• फ्रन्ट डेस्क / कल: +९७७-१-४५३०३११ / +९७७ ९८५१०६८२१९\n• इमेल: info@hotelsherpasoul.com\n• वेबसाइट: https://hotelsherpasoul.com\n• २४ सै घण्टा खुला फ्रन्ट डेस्क\n\nहामी शान्त निद्रा, सफा कोठा, २४ सै घण्टा तातो पानी, द्रुत गतिको वाइफाइ र शेर्पा जातिको हार्दिक आतिथ्यता प्रदान गर्दछौँ!",
    answerHi: "होटल शेरपा सोल थमेल, काठमांडू में स्थित एक शांत बुटीक होटल है। WhatsApp: +977-9818259472, फोन: +977-9851068219, info@hotelsherpasoul.com 😊"
  }
];

// Search Grounded Knowledge Base first, then fallback to DB
const CATEGORY_ALIASES: Record<string, string[]> = {
  HOTEL_INFORMATION: ['HOTEL_INFORMATION', 'FACILITIES', 'LOCATION'],
  ROOM_AMENITIES: ['ROOM_AMENITIES', 'FACILITIES', 'HOT_WATER', 'WIFI'],
  CHECK_OUT: ['CHECK_IN', 'POLICY'],
  CHECK_IN: ['CHECK_IN', 'POLICY'],
  DISCOUNT: ['PAYMENT'],
  PAYMENT: ['PAYMENT'],
  FACILITIES: ['FACILITIES', 'HOTEL_INFORMATION', 'SHARED_KITCHEN'],
  LOCATION: ['LOCATION'],
  POLICY: ['POLICY', 'CHECK_IN'],
  SAFETY: ['SAFETY', 'POLICY'],
  LUGGAGE: ['LUGGAGE'],
  TREKKING: ['TREKKING'],
  ROOFTOP: ['ROOFTOP'],
  HOT_WATER: ['HOT_WATER', 'ROOM_AMENITIES'],
  WIFI: ['WIFI', 'ROOM_AMENITIES'],
  TRANSPORTATION: ['TRANSPORTATION'],
  SHARED_KITCHEN: ['SHARED_KITCHEN', 'FACILITIES'],
};

// Search Grounded Knowledge Base first, then fallback to DB
export async function searchKnowledgeBase(
  query: string,
  langOrCategory?: string,
  categoryParam?: string
): Promise<string | null> {
  if (!query || typeof query !== 'string') return null;

  const isLang = langOrCategory === 'en' || langOrCategory === 'ne' || langOrCategory === 'hi';
  const lang: 'en' | 'ne' | 'hi' = isLang ? (langOrCategory as 'en' | 'ne' | 'hi') : 'en';
  const targetCategory = isLang ? categoryParam : langOrCategory;

  const qLower = query.toLowerCase().trim();
  const relevantCategories = targetCategory
    ? CATEGORY_ALIASES[targetCategory] || [targetCategory]
    : [];

  // 1. Search in-memory curated website facts with weighted keyword scoring
  let bestItem: WebsiteKnowledgeItem | null = null;
  let highestScore = 0;

  for (const item of HOTEL_WEBSITE_KNOWLEDGE) {
    let score = 0;

    // Category relevance bonus
    if (relevantCategories.length > 0 && relevantCategories.includes(item.category)) {
      score += 3;
    }

    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      if (qLower.includes(kwLower)) {
        // Multi-word exact match gets higher weight
        score += kwLower.includes(' ') ? 4 : 2;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestItem = item;
    }
  }

  // Threshold: at least 2 points to ensure relevant match
  if (bestItem && highestScore >= 2) {
    if (lang === 'ne') return bestItem.answerNe;
    if (lang === 'hi' && bestItem.answerHi) return bestItem.answerHi;
    return bestItem.answerEn;
  }

  // 2. Search Prisma Database for custom dynamic entries
  try {
    const entries = await prisma.knowledgeBase.findMany({
      where: {
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    for (const item of entries) {
      if (item.keywords) {
        const keywords = item.keywords.split(',').map((k) => k.trim().toLowerCase());
        const match = keywords.some((k) => qLower.includes(k));
        if (match) {
          return item.answer;
        }
      }
    }
  } catch (err) {
    console.error('Database KB Search Error:', err);
  }

  return null;
}

// Format the dynamic Room Price response
export function formatRoomPricesMessage(rates: GroundedKnowledge['roomPrices'], lang: 'en' | 'ne' | 'hi' = 'en'): string {
  if (lang === 'ne') {
    return `हाम्रो हालको सुरुवाती दर र कोठाका प्रकारहरू निम्नानुसार छन्:
• डिलक्स कोठा (Deluxe Room) — USD ${rates.deluxe}/रात — एयर कन्डिसनिङ (AC) सहित, २ वयस्क + १ बच्चा सम्म
• बजेट फेमिली कोठा (Budget Family Room) — USD ${rates.budgetFamily}/रात — Non-AC (फ्यानसहित, अरू सबै सुविधा समान), ३ वयस्क + १ बच्चा सम्म
• फेमिली कोठा (Family Room) — USD ${rates.family}/रात — एयर कन्डिसनिङ (AC) सहितको फराकिलो कोठा, ३ वयस्क + १ बच्चा सम्म

✨ लामो समय बस्ने पाहुनाका लागि विशेष सुविधा (Free Shared Kitchen):
२ हप्ता (१४ दिन) वा सोभन्दा बढी बस्ने पाहुनाहरूका लागि हामी कोठा १०२ (Room 102) मा पूर्ण सुविधायुक्त साझा भान्सा (Shared Kitchen) निःशुल्क उपलब्ध गराउँछौँ!

यदि यहाँले आफ्नो यात्रा मिति र पाहुना संख्या बताउनुभयो भने, म उपयुक्त कोठा उपलब्धता हेर्न मद्दत गर्नेछु 😊`;
  }

  if (lang === 'hi') {
    return `हमारे वर्तमान शुरुआती कमरे के दर और प्रकार:
• डीलक्स रूम (Deluxe Room) — USD ${rates.deluxe}/रात — AC सहित, 2 वयस्क + 1 बच्चा तक
• बजट फैमिली रूम (Budget Family Room) — USD ${rates.budgetFamily}/रात — Non-AC (फैन सहित, बाकी सभी सुविधाएं समान), 3 वयस्क + 1 बच्चा तक
• फैमिली रूम (Family Room) — USD ${rates.family}/रात — AC सहित बड़ा कमरा, 3 वयस्क + 1 बच्चा तक

✨ लंबी अवधि के मेहमानों के लिए विशेष (Free Shared Kitchen):
2 सप्ताह (14 दिन) या अधिक रुकने वाले मेहमानों के लिए हम कमरा 102 में पूरी तरह सुसज्जित शेयर्ड किचन बिल्कुल मुफ़्त उपलब्ध कराते हैं!

यदि आप अपनी तारीखें और मेहमानों की संख्या बताएंगे, तो मैं उपलब्धता की जाँच कर सकता हूँ 😊`;
  }

  return `Our current room categories and starting rates are:
• Deluxe Room — USD ${rates.deluxe}/night — with Air Conditioning (AC), up to 2 adults + 1 child
• Budget Family Room — USD ${rates.budgetFamily}/night — Non-AC (with fan; all other amenities same as Deluxe/Family), up to 3 adults + 1 child
• Family Room — USD ${rates.family}/night — with Air Conditioning (AC), spacious layout up to 3 adults + 1 child

✨ Long-Stay Special Perk (FREE Shared Kitchen):
For guests staying 2 weeks (14 nights) or more, we provide our fully equipped Shared Kitchen (Room 102) completely FREE of charge!

If you share your travel dates and number of guests, I can check room availability for you 😊`;
}
