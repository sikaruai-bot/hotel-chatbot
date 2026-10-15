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
    answerEn: "Yes! Drawing from our authentic Sherpa mountain heritage, Hotel Sherpa Soul provides complete travel and trekking desk support right from our front desk 😊\n\nWe can arrange:\n• Trekking permits (TIMS Card, Sagarmatha National Park, Annapurna ACAP)\n• Certified, licensed Sherpa trekking guides and porters\n• Domestic mountain flights (Kathmandu–Lukla, Pokhara, etc.)\n• Kathmandu Valley cultural sightseeing tours\n\nFeel free to speak directly with our front desk or message us on WhatsApp at +977-9818259472 for personalized trek planning!",
    answerNe: "हजुर! हाम्रो आफ्नै शेर्पा परम्परा र अनुभवका साथ होटल शेर्पा सोलले ट्रेकिङ र यात्रा सम्बन्धी सम्पूर्ण सेवा उपलब्ध गराउँछ 😊\n\nहामी मार्फत:\n• ट्रेकिङ अनुमतिपत्रहरू (TIMS, सगरमाथा राष्ट्रिय निकुञ्ज, अन्नपूर्ण ACAP Permits)\n• लाइसेन्सप्राप्त अनुभवी शेर्पा ट्रेकिङ गाइड तथा पोर्टर\n• आन्तरिक हवाई टिकट (लुक्ला, पोखरा उडानहरू)\n• काठमाडौँ उपत्यका दृश्यावलोकन (Sightseeing) टुरहरू\nसजिलै व्यवस्था गर्न सकिन्छ। थप जानकारीका लागि हाम्रो फ्रन्ट डेस्क वा सिधै ह्वाट्सएप (+९७७ ९८१८२५९४७२) मा सम्पर्क गर्न सक्नुहुन्छ!",
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
    answerEn: "Yes! We arrange reliable private airport pick-up and drop-off transfers to and from Tribhuvan International Airport (TIA/KTM), which is about 6 km (~20-30 minutes) from our hotel 😊\n\nTo arrange an airport transfer, you can request it during booking or message our front desk on WhatsApp at +977-9818259472 with your flight number and arrival time. A trusted driver will meet you right outside the airport arrivals terminal!",
    answerNe: "हजुर! हामी त्रिभुवन अन्तर्राष्ट्रिय विमानस्थल (TIA) बाट होटलसम्म भरपर्दो एयरपोर्ट पिकअप र ड्रप (Airport Transfer) सेवा व्यवस्था गर्दछौँ। होटल विमानस्थलबाट करिब ६ कि.मि. (२०-३० मिनेट) दूरीमा छ 😊\n\nगाडी मगाउनका लागि यहाँले बुकिङ गर्दा वा हाम्रो फ्रन्ट डेस्कको ह्वाट्सएप (+९७७ ९८१८२५९४७२) मा आफ्नो उडान नम्बर (Flight Number) र आगमन समय पठाउन सक्नुहुन्छ। चालकले विमानस्थलमै यहाँलाई स्वागत गर्नेछन्!",
    answerHi: "हाँ! हम त्रिभुवन अंतर्राष्ट्रीय हवाई अड्डे (TIA) से होटल तक विश्वसनीय एयरपोर्ट पिकअप और ड्रॉप की व्यवस्था करते हैं। आप व्हाट्सएप पर (+977-9818259472) अपनी फ्लाइट विवरण भेजकर टैक्सी बुक कर सकते हैं 😊"
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
      'hours', 'early check in', 'late check out', 'timing', '24/7', 'समय', 'चेक इन', 'चेक आउट', 'रिसेप्सन',
      'flexible check-in', 'flexible check in', 'early arrival', 'luggage storage', 'check-in policy', 'check in policy'
    ],
    answerEn: "Here are our check-in and check-out policies at Hotel Sherpa Soul 😊:\n\n• Check-in: Flexible from 12:00 PM, subject to room availability.\n• Early arrival: free luggage storage; early check-in subject to availability.\n• Check-out: 11:00 AM; late check-out on request, subject to availability.\n\nOur front desk is staffed 24 hours a day, 7 days a week to welcome you!",
    answerNe: "होटल शेर्पा सोलको चेक-इन र चेक-आउट नीतिहरू 😊:\n\n• चेक-इन: दिउँसो १२:०० बजेदेखि लचिलो (Flexible from 12:00 PM), कोठा उपलब्धताको आधारमा।\n• सबेरै आगमन (Early arrival): निःशुल्क लगेज भण्डारण (free luggage storage); कोठा खाली भएमा अर्ली चेक-इन उपलब्ध।\n• चेक-आउट: बिहान ११:०० बजे; अनुरोधमा लेट चेक-आउट (कोठा उपलब्धताको आधारमा)।\n\nहाम्रो फ्रन्ट डेस्क यहाँलाई स्वागत गर्न २४ सै घण्टा खुला रहन्छ!",
    answerHi: "होटल शेरपा सोल की चेक-इन और चेक-आउट नीतियां 😊:\n\n• चेक-इन: दोपहर 12:00 बजे से लचीला (कमरे की उपलब्धता पर निर्भर)।\n• जल्दी आगमन: मुफ्त लगेज स्टोरेज; उपलब्धता के अनुसार जल्दी चेक-इन।\n• चेक-आउट: सुबह 11:00 बजे; अनुरोध पर देर से चेक-आउट (उपलब्धता पर निर्भर)।\n\nहमारा फ्रंट डेस्क 24 घंटे खुला रहता है!"
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
      'contact', 'phone', 'whatsapp', 'email', 'e-mail', 'mail', 'होटलको बारेमा', 'परिचय', 'सम्पर्क'
    ],
    answerEn: "Hotel Sherpa Soul is a tranquil boutique hotel located at 26 Thamel Bhagwati Marg, Kathmandu, inspired by authentic Himalayan Sherpa hospitality 😊\n\n• Motto: 'No Restaurant. No Noise. Sleep Well.'\n• WhatsApp Chatbot: +977-9818259472 (wa.me/9779818259472)\n• Front Desk / Call: +977-1-4530311 / +977-9818259472\n• Email: info@hotelsherpasoul.com\n• Website: https://hotelsherpasoul.com\n• 24/7 Reception Desk\n\nWe provide clean restful rooms, 24/7 hot showers, high-speed fiber Wi-Fi, and licensed trekking guidance!",
    answerNe: "होटल शेर्पा सोल ठमेल भगवती मार्ग २६, काठमाडौँमा अवस्थित एक शान्त र आरामदायी बुटिक होटल हो 😊\n\n• आदर्श वाक्य: 'No Restaurant. No Noise. Sleep Well.'\n• ह्वाट्सएप च्याटबोट: +९७७ ९८१८२५९४७२ (wa.me/9779818259472)\n• फ्रन्ट डेस्क / कल: +९७७-१-४५३०३११ / +९७७ ९८१८२५९४७२\n• इमेल: info@hotelsherpasoul.com\n• वेबसाइट: https://hotelsherpasoul.com\n• २४ सै घण्टा खुला फ्रन्ट डेस्क\n\nहामी शान्त निद्रा, सफा कोठा, २४ सै घण्टा तातो पानी, द्रुत गतिको वाइफाइ र शेर्पा जातिको हार्दिक आतिथ्यता प्रदान गर्दछौँ!",
    answerHi: "होटल शेरपा सोल थमेल, काठमांडू में स्थित एक शांत बुटीक होटल है। WhatsApp: +977-9818259472, फोन: +977-1-4530311 / +977-9818259472, info@hotelsherpasoul.com 😊"
  },
  {
    id: 'hotel_email_contact',
    category: 'HOTEL_INFORMATION',
    keywords: [
      'email', 'e-mail', 'mail', 'email address', 'official email', 'hotel email',
      'email k ho', 'email ke ho', 'email k cha', 'email cha', 'email chahiyo', 'email pathaunus',
      'इमेल', 'ईमेल', 'इमेल ठेगाना', 'ईमेल पता', 'इमेल के हो', 'ईमेल क्या है'
    ],
    answerEn: "Our official hotel email address is info@hotelsherpasoul.com 😊\n\n• Official Email: info@hotelsherpasoul.com\n• Front Desk / Call: +977-1-4530311 / +977-9818259472\n• WhatsApp: +977-9818259472 (wa.me/9779818259472)\n• Website: https://hotelsherpasoul.com\n\nFeel free to email us for reservations, trekking permits, visa confirmation letters, or any inquiries!",
    answerNe: "होटल शेर्पा सोलको आधिकारिक इमेल ठेगाना info@hotelsherpasoul.com हो 😊\n\n• आधिकारिक इमेल: info@hotelsherpasoul.com\n• फ्रन्ट डेस्क / कल: +९७७-१-४५३०३११ / +९७७ ९८१८२५९४७२\n• ह्वाट्सएप: +९७७ ९८१८२५९४७२ (wa.me/9779818259472)\n• वेबसाइट: https://hotelsherpasoul.com\n\nबुकिङ, ट्रेकिङ अनुमतिपत्र वा आधिकारिक कन्फर्मेसन लेटरका लागि यहाँले सिधै हामीलाई इमेल गर्न सक्नुहुन्छ!",
    answerHi: "होटल शेरपा सोल का आधिकारिक ईमेल पता info@hotelsherpasoul.com है 😊\n\n• आधिकारिक ईमेल: info@hotelsherpasoul.com\n• फोन: +977-1-4530311 / +977-9818259472\n• WhatsApp: +977-9818259472\n\nआप किसी भी जानकारी या बुकिंग के लिए हमें बेझिझक ईमेल कर सकते हैं!"
  },
  {
    id: 'hotel_floors_layout',
    category: 'FLOORS',
    keywords: [
      'floor', 'floors', 'which floor', 'kun floor', 'kun kun floor', 'second floor',
      'third floor', 'ground floor', 'room numbers', 'tala', 'kati tala', 'kun tala',
      'तला', 'कति तला', 'कुन तला', 'भुइँतला', 'building layout', 'building', 'rook kun kun floor',
      'room kun kun floor', 'floor ma chha'
    ],
    answerEn: "Hotel Sherpa Soul features a quiet, low-density layout across 3 floors 😊:\n\n• 🏢 Ground Floor: 24/7 Front Desk Reception Lobby & Secure Luggage Storage\n• 🍳 1st Floor: Room 102 — Fully equipped Shared Kitchen (FREE for guests staying 2+ weeks)\n• 🏨 2nd Floor: Guest Rooms 201 (Deluxe AC), 202 (Deluxe AC), 203 (Budget Family Non-AC)\n• 🏨 3rd Floor: Guest Rooms 301 (Deluxe AC), 302 (Budget Family Non-AC), 303 (Family Room AC)\n• ☀️ Top / Rooftop: Open Rooftop Terrace with panoramic views of Kathmandu valley & mountains\n\nWe strictly maintain only 6 quiet guest rooms (on the 2nd and 3rd floors) so our guests enjoy peace, privacy, and deep, restful sleep!",
    answerNe: "होटल शेर्पा सोलमा कोठा र सुविधाहरू निम्न तलामा व्यवस्थित छन् 😊:\n\n• 🏢 भुइँतला (Ground Floor): २४ सै घण्टा खुला रिसेप्सन (फ्रन्ट डेस्क) र निःशुल्क लगेज भण्डारण\n• 🍳 पहिलो तला (1st Floor): कोठा १०२ — लामो समय (२ हप्ता वा सोभन्दा बढी) बस्ने पाहुनाका लागि निःशुल्क साझा भान्सा (Shared Kitchen)\n• 🏨 दोस्रो तला (2nd Floor): पाहुना कोठाहरू २०१ (Deluxe AC), २०२ (Deluxe AC), २०३ (Budget Family Non-AC)\n• 🏨 तेस्रो तला (3rd Floor): पाहुना कोठाहरू ३०१ (Deluxe AC), ३०२ (Budget Family Non-AC), ३०३ (Family Room AC)\n• ☀️ रुफटप (Rooftop Terrace): काठमाडौँ उपत्यका र हिमाल देखिने खुला शान्त टेरेस\n\nहोटलमा दोस्रो र तेस्रो तलामा गरी जम्मा ६ वटा मात्र शान्त पाहुना कोठा छन्, जसले गर्दा कुनै होहल्ला वा भीडभाड हुँदैन!",
    answerHi: "होटल शेरपा सोल में भूतल पर रिसेप्शन और लगेज स्टोरेज, पहली मंजिल पर शेयर्ड किचन (कमरा 102), दूसरी मंजिल पर कमरे 201-203, तीसरी मंजिल पर कमरे 301-303, और सबसे ऊपर खुला रूफटॉप टेरेस है 😊"
  },
  {
    id: 'elevator_stairs',
    category: 'ELEVATOR',
    keywords: [
      'elevator', 'lift', 'stairs', 'staircase', 'wheelchair', 'lift chha', 'lift cha',
      'लिफ्ट', 'भर्‍याङ'
    ],
    answerEn: "Hotel Sherpa Soul is an intimate 3-storey boutique hotel with comfortable, wide indoor staircases and does not have an elevator (lift) 😊\n\nOur friendly 24/7 staff will gladly assist with carrying all your heavy luggage and trekking bags directly to and from your room. If you prefer a lower floor (2nd floor), please let us know when booking!",
    answerNe: "होटल शेर्पा सोल ३ तले शान्त बुटिक होटल भएकोले यसमा लिफ्ट (Elevator) छैन, सजिलो र फराकिलो भर्‍याङ (Stairs) छ 😊\n\nहाम्रा २४ सै घण्टा उपलब्ध कर्मचारी साथीहरूले यहाँको सम्पूर्ण ठूला लगेज र ट्रेकिङ झोलाहरू कोठासम्म पुर्‍याउन र झार्न सहर्ष सहयोग गर्नेछन्। यदि यहाँलाई तल्लो तल्ला (दोस्रो तला) को कोठा मन पर्छ भने बुकिङ गर्दा जानकारी गराउन सक्नुहुन्छ!",
    answerHi: "होटल शेरपा सोल में लिफ्ट नहीं है, आसान और चौड़ी सीढ़ियाँ हैं। हमारा 24/7 स्टाफ आपका सारा भारी सामान और ट्रेकिंग बैग खुशी-खुशी कमरे तक पहुँचा देगा 😊"
  },
  {
    id: 'couple_friendly',
    category: 'COUPLE_FRIENDLY',
    keywords: [
      'couple', 'unmarried', 'couple friendly', 'boy girl', 'girlfriend', 'boyfriend',
      'जोडी', 'दम्पती', 'couple allowed'
    ],
    answerEn: "Yes! Hotel Sherpa Soul warmly welcomes adult couples (married and unmarried) and solo travelers 😊\n\nAll adult guests must present valid government photo identification (Citizenship card, Passport, Driving License, or National ID) during check-in. We strictly ensure guest privacy, quiet comfort, and a safe, respectful environment.",
    answerNe: "हजुर! होटल शेर्पा सोल सबै वयस्क जोडीहरू (विवाहित तथा अविवाहित) लाई हार्दिक स्वागत गर्दछ 😊\n\nसबै वयस्क पाहुनाहरूसँग चेक-इनको समयमा मान्य सरकारी फोटो परिचयपत्र (नागरिकता, राहदानी, ड्राइभिङ लाइसेन्स वा राष्ट्रिय परिचयपत्र) हुनुपर्दछ। हामी हाम्रा सम्पूर्ण पाहुनाहरूको गोपनीयता, सुरक्षा र शान्त वातावरणको पूर्ण सम्मान गर्दछौँ!",
    answerHi: "हाँ! होटल शेरपा सोल सभी वयस्क जोड़ों का गर्मजोशी से स्वागत करता है। चेक-इन के समय वैध सरकारी फोटो आईडी आवश्यक है। हम गोपनीयता और सुरक्षा का पूरा ध्यान रखते हैं 😊"
  },
  {
    id: 'booking_confirmation_voucher',
    category: 'BOOKING_CONFIRMATION',
    keywords: [
      'confirmation', 'conformation', 'comfirmation', 'booking letter', 'letter chahiyo',
      'letter dinus', 'booking slip', 'booking receipt', 'voucher', 'confirmation slip',
      'visa letter', 'proof of booking', 'booking gareko letter', 'booking praman',
      'पुष्टि पत्र', 'रसिद', 'भौचर', 'लेटर चाहियो'
    ],
    answerEn: "Yes! Hotel Sherpa Soul provides an official Reservation Confirmation Letter & Digital Voucher on official hotel letterhead 😊\n\n• For Visa / Embassy / Trek Permit purposes: We issue formal PDF booking vouchers with our company registration and official stamp completely FREE of charge.\n• No advance deposit required.\n• If you have an active booking with us, our front desk can email or WhatsApp your official confirmation letter immediately. You can also message our front desk directly at +977-9818259472!",
    answerNe: "हजुर! होटल शेर्पा सोलले आधिकारिक लेटरहेड र होटलको छाप (Official Stamp) सहितको बुकिङ कन्फर्मेसन लेटर (Booking Confirmation Letter / Voucher) निःशुल्क उपलब्ध गराउँछ 😊\n\n• नेपाल पर्यटक भिसा, दूतावास वा ट्रेकिङ पर्मिट प्रयोजनका लागि आधिकारिक PDF लेटर प्राप्त गर्न सकिन्छ।\n• कुनै अग्रिम रकम (Advance Deposit) तिर्नु पर्दैन।\n• यहाँको बुकिङ सुरक्षित भएपछि हाम्रो फ्रन्ट डेस्कले ह्वाट्सएप (+९७७ ९८१८२५९४७२) वा इमेलमा तुरुन्त लेटर पठाइदिनेछ!",
    answerHi: "हाँ! होटल शेरपा सोल वीज़ा, परमिट या यात्रा के लिए अपने आधिकारिक लेटरहेड और मुहर के साथ बुकिंग कन्फर्मेशन लेटर / वाउचर मुफ्त में प्रदान करता है 😊"
  },
  {
    id: 'nearby_food_breakfast',
    category: 'FACILITIES',
    keywords: [
      'breakfast', 'where to eat', 'khana kata khane', 'cafe', 'dining', 'restaurant nearby',
      'khaja', 'dal bhat', 'thali', 'बिहानको खाजा', 'खाना कहाँ खाने', 'कहाँ खाने', 'नास्ता', 'नास्ता कहाँ',
      'nasta', 'food nearby', 'eating options', 'dinner place', 'lunch place'
    ],
    answerEn: "Because our core philosophy is 'No Restaurant. No Noise. Sleep Well', we intentionally don't operate an in-house restaurant so rooms remain peaceful, quiet, and fresh 😊\n\nHowever, our location in Thamel puts dozens of fantastic dining options just 1–2 minutes walk away:\n• Morning Coffee & Breakfast: Himalayan Java Coffee, European-style bakeries, and organic cafes right down our street.\n• Traditional Nepali & Newari: Authentic Thakali Dal Bhat and Newari khaja sets around Thamel Bhagwati Marg.\n• International Cuisine: Italian wood-fired pizza, Indian, and Continental restaurants steps away.\n\nOur front desk is always delighted to recommend our favorite clean, tasty local spots!",
    answerNe: "शान्त वातावरण र मीठो निद्राका लागि हाम्रो नीति 'No Restaurant. No Noise. Sleep Well.' भएकोले हामी होटलभित्र व्यावसायिक रेस्टुरेन्ट राख्दैनौँ 😊 तर होटलबाट १–२ मिनेटमै थुप्रै उत्कृष्ट ठाउँहरू उपलब्ध छन्:\n• बिहानको ब्रेकफास्ट र कफी: Himalayan Java, स्थानीय बेकरीहरू र अर्गानिक क्याफेहरू (१ मिनेटमै पुगिने)।\n• नेपाली तथा थकाली खाना: परम्परागत नेपाली दाल-भात, थकाली भान्सा घर र नेवारी खाजा घरहरू।\n• अन्तर्राष्ट्रिय खाना: इटालियन पिज्जा, भारतीय तथा कन्टिनेन्टल रेस्टुरेन्टहरू।\n\nहाम्रो फ्रन्ट डेस्कले यहाँलाई मिठो र सफा खाना पाउने नजिकका ठाउँहरू सहर्ष सिफारिस गरिदिनेछ!",
    answerHi: "कमरों में शांति बनाए रखने के लिए होटल में इन-हाउस रेस्टोरेंट नहीं है, लेकिन 1-2 मिनट की पैदल दूरी पर हिमालयन जावा कैफे, बेकरी और पारंपरिक नेपाली दाल-भात के कई बेहतरीन विकल्प उपलब्ध हैं 😊"
  },
  {
    id: 'early_checkin_late_checkout',
    category: 'CHECK_IN',
    keywords: [
      'early check in', 'early morning', 'night bus', 'late check out', 'chaudo aayo vane',
      'chhito aayo vane', 'early arrival', 'छिटो आयो भने', 'सबेरै आएमा', 'चाँडै आएमा',
      'early checkin', 'late checkout', 'morning check in', 'late arrival', 'flexible check-in', 'flexible check in'
    ],
    answerEn: "If you arrive early in the morning (for example from an overnight flight or night bus), you are warmly welcome to come straight to Hotel Sherpa Soul 😊\n\n• Check-in: Flexible from 12:00 PM, subject to room availability.\n• Early arrival: free luggage storage; early check-in subject to availability completely free of charge!\n• Check-out: 11:00 AM; late check-out on request, subject to availability.\n\nWhile waiting, you can safely store your bags at reception, freshen up, and relax on our rooftop terrace or lounge with free Wi-Fi.",
    answerNe: "यदि यहाँ बिहान सबेरै (जस्तै नाइट बस वा बिहानको उडानबाट) आइपुग्नुभयो भने सिधै होटल शेर्पा सोलमा आउन सक्नुहुन्छ 😊\n\n• चेक-इन: दिउँसो १२:०० बजेदेखि लचिलो (Flexible from 12:00 PM), कोठा खाली भएको अवस्थामा।\n• सबेरै आगमन: हाम्रो २४/७ रिसेप्सनमा निःशुल्क लगेज सुरक्षित राख्न सक्नुहुन्छ र कोठा तयार भएमा कुनै अतिरिक्त शुल्क बिना अर्ली चेक-इन पाइन्छ!\n• चेक-आउट: बिहान ११:०० बजे; अनुरोधमा लेट चेक-आउट (उपलब्धताको आधारमा)।\n\nयहाँले हाम्रो रुफटप टेरेस वा लबीमा बसेर आराम वा निःशुल्क वाइफाइ चलाउन सक्नुहुन्छ।",
    answerHi: "यदि आप सुबह जल्दी आते हैं, तो हम 24/7 रिसेप्शन पर मुफ्त लगेज स्टोरेज प्रदान करते हैं। कमरा खाली होने पर 12:00 बजे से पहले भी अर्ली चेक-इन संभव है। चेक-आउट 11:00 बजे है 😊"
  },
  {
    id: 'taxi_directions_landmark',
    category: 'LOCATION',
    keywords: [
      'taxi driver', 'how to reach', 'directions', 'driver lai k bhanne', 'landmark',
      'bhagwati marg', 'kata bhannu', 'taxi lai k bhanne', 'ट्याक्सीलाई के भन्ने', 'बाटो',
      'directions to hotel', 'find hotel', 'driver', 'taxi guidance', 'kasari pugne'
    ],
    answerEn: "To guide your taxi driver smoothly to Hotel Sherpa Soul, simply tell them:\n'Thamel Bhagwati Marg, near Bhagwati Mandir (Temple)' 😊\n\nOur address is 26 Thamel Bhagwati Marg. We are situated in a quiet alley directly across from the Bhagwati Temple (just 30 meters off the main street).\n\nIf the driver needs exact phone guidance, have them call our 24/7 front desk at +977-1-4530311 or WhatsApp us at +977-9818259472 and our staff will guide them directly in Nepali!",
    answerNe: "ट्याक्सी चालकलाई होटलसम्म सजिलै ल्याउनका लागि सिधै भन्न सक्नुहुन्छ:\n'ठमेल भगवती मार्ग, भगवती मन्दिर नजिक' 😊\n\nहाम्रो ठेगाना २६ ठमेल भगवती मार्ग हो। हामी भगवती मन्दिरको ठीक अगाडिपट्टी मुख्य बाटोबाट ३० मिटर भित्र शान्त गल्लीमा छौँ।\n\nयदि चालकलाई बाटो ठ्याक्कै थाहा भएन भने हाम्रो फ्रन्ट डेस्क (+९७७-१-४५३०३११ वा ह्वाट्सएप +९७७ ९८१८२५९४७२) मा फोन गर्न दिनुहोला, हामी चालकलाई फोनमै सजिलै बाटो सम्झाइदिनेछौँ!",
    answerHi: "टैक्सी चालक को बस इतना कहें: 'थमेल भगवती मार्ग, भगवती मंदिर के पास'। हमारा होटल मंदिर के ठीक सामने 26 नंबर पर स्थित है 😊 यदि चालक को रास्ता न मिले तो वह हमारे फ्रंट डेस्क (+977-1-4530311) पर कॉल कर सकता है।"
  },
  {
    id: 'tourist_bus_park_distance',
    category: 'TRANSPORTATION',
    keywords: [
      'bus park', 'tourist bus', 'sorhakhutte', 'pokhara bus', 'chitwan bus', 'bus park bata kata',
      'bus park distance', 'बसपार्क', 'सोह्रखुट्टे', 'बस पार्क', 'pokhara jane bus', 'chitwan jane bus'
    ],
    answerEn: "Hotel Sherpa Soul is located just a 5 to 7-minute walk (~500 meters) from the Sorhakhutte Tourist Bus Park, where all morning tourist buses to Pokhara and Chitwan depart and arrive 😊\n\nThis makes our hotel exceptionally convenient for travelers exploring Nepal! Our front desk can also assist you with tourist bus ticket bookings and early morning departure arrangements.",
    answerNe: "होटल शेर्पा सोल सोह्रखुट्टे टुरिस्ट बसपार्क (Sorhakhutte Tourist Bus Park) बाट मात्र ५ देखि ७ मिनेटको पैदल दूरी (करिब ५०० मिटर) मा अवस्थित छ 😊\n\nपोखरा वा चितवन जाने सम्पूर्ण बिहानी पर्यटक बसहरू यहीँबाट छुट्छन् र आइपुग्छन्। पोखरा/चितवन यात्राका लागि हाम्रो स्थान अत्यन्तै पायक पर्ने छ। साथै बस टिकटको व्यवस्था पनि हाम्रो फ्रन्ट डेस्कबाटै मिलाउन सकिन्छ!",
    answerHi: "होटल शेरपा सोल सोह्रखुट्टे टूरिस्ट बस पार्क (जहाँ से पोखरा और चितवन की बसें चलती हैं) से केवल 5-7 मिनट की पैदल दूरी पर है 😊"
  },
  {
    id: 'drinking_water_kettle',
    category: 'ROOM_AMENITIES',
    keywords: [
      'drinking water', 'water refill', 'kettle', 'hot water to drink', 'boiled water',
      'tea coffee', 'pani', 'water', 'खाने पानी', 'पिउने पानी', 'केटल', 'तातो पानी पिउने',
      'mineral water', 'filter water'
    ],
    answerEn: "Yes! Hotel Sherpa Soul provides safe, clean drinking water for all our guests 😊\n\n• Every room is equipped with an electric kettle and complimentary tea/coffee supplies.\n• Safe, filtered drinking water refills are readily available throughout your stay completely free of charge.\n• You can prepare fresh tea, coffee, or hot drinking water in your room at any time!",
    answerNe: "हजुर! होटल शेर्पा सोलमा पिउने सफा र सुरक्षित पानीको पूर्ण व्यवस्था छ 😊\n\n• प्रत्येक कोठामा इलेक्ट्रिक केटल (Electric Kettle) र चिया/कफी बनाउने सामग्री उपलब्ध छ।\n• शुद्ध र सुरक्षित फिल्टर गरिएको पिउने पानी (Refill) होटलमा सधैँ निःशुल्क उपलब्ध छ।\n• यहाँले कुनै पनि बेला कोठाभित्रै तातो पानी वा चिया बनाएर पिउन सक्नुहुन्छ!",
    answerHi: "हाँ! प्रत्येक कमरे में इलेक्ट्रिक केतली और चाय/कॉफी का सामान उपलब्ध है, तथा सुरक्षित पीने का पानी हमेशा निःशुल्क उपलब्ध रहता है 😊"
  },
  {
    id: 'ota_booking_links',
    category: 'PAYMENT',
    keywords: [
      'booking.com', 'airbnb', 'trip.com', 'ota', 'online booking', 'booking link',
      'agoda', 'बुकिङ लिङ्क', 'booking com', 'ota links', 'website link', 'book online'
    ],
    answerEn: "You can book Hotel Sherpa Soul across major travel platforms, or book directly for the best guaranteed rate 😊:\n\n• 🌟 Direct Booking (10% Instant Discount & Best Rate Guarantee): https://hotelsherpasoul.com/book-now\n• 🏨 Booking.com: https://www.booking.com/hotel/np/hotel-sherpa-soul.html\n• 🏡 Airbnb: https://www.airbnb.com/rooms/1760024961976448522\n• ✈️ Trip.com: https://www.trip.com/hotels/list?keyword=Hotel%20Sherpa%20Soul%20Kathmandu\n\nBooking directly through our website or right here on chat gives you the highest savings without any advance deposit!",
    answerNe: "होटल शेर्पा सोल यहाँले मुख्य ट्राभल प्लेटफर्महरूबाट वा सिधै हाम्रो आधिकारिक वेबसाइटबाट बुक गर्न सक्नुहुन्छ 😊:\n\n• 🌟 सिधै बुकिङ (१०% तुरुन्त छुट र सबैभन्दा सस्तो दर): https://hotelsherpasoul.com/book-now\n• 🏨 Booking.com: https://www.booking.com/hotel/np/hotel-sherpa-soul.html\n• 🏡 Airbnb: https://www.airbnb.com/rooms/1760024961976448522\n• ✈️ Trip.com: https://www.trip.com/hotels/list?keyword=Hotel%20Sherpa%20Soul%20Kathmandu\n\nसिधै हामीसँग वेबसाइट वा यहीँ च्याटमा बुक गर्दा कुनै अग्रिम रकम नतिरी तुरुन्त १०% छुट प्राप्त हुन्छ!",
    answerHi: "आप होटल शेरपा सोल को Booking.com, Airbnb, Trip.com या हमारी आधिकारिक वेबसाइट (https://hotelsherpasoul.com/book-now) पर सीधे बुक कर सकते हैं, जहाँ आपको 10% की अतिरिक्त छूट मिलती है 😊"
  },
  {
    id: 'google_maps_location',
    category: 'LOCATION',
    keywords: [
      'google maps', 'map link', 'map', 'location link', 'gps', 'गुगल म्याप', 'म्याप',
      'नक्सा', 'location pathaunus', 'map pathaunus', 'google map', 'google map link'
    ],
    answerEn: "Here is the exact Google Maps location for Hotel Sherpa Soul 😊:\n\n📍 Google Maps Navigation: https://maps.app.goo.gl/nDB9DnLtb6taeaLRA\n• Address: 26 Thamel Bhagwati Marg, Thamel, Kathmandu 44600, Nepal\n• Landmark: Across from Bhagwati Mandir (Temple) in a quiet alley (30 meters off the road)\n• GPS Coordinates: 27.7154° N, 85.3123° E\n\nTap the link above to open turn-by-turn navigation directly on your phone!",
    answerNe: "होटल शेर्पा सोलको ठ्याक्कै गुगल म्याप (Google Maps) लोकेसन तलको लिङ्कमा हेर्न सक्नुहुन्छ 😊:\n\n📍 गुगल म्याप: https://maps.app.goo.gl/nDB9DnLtb6taeaLRA\n• ठेगाना: २६ ठमेल भगवती मार्ग, ठमेल, काठमाडौँ ४४६००\n• ल्यान्डमार्क: भगवती मन्दिरको ठीक अगाडि शान्त गल्लीभित्र (मुख्य बाटोबाट ३० मिटर भित्र)\n• GPS: 27.7154° N, 85.3123° E\n\nमाथिको लिङ्क थिचेर यहाँले सिधै बाटो हेर्दै आइपुग्न सक्नुहुन्छ!",
    answerHi: "होटल शेरपा सोल का गूगल मैप लिंक: https://maps.app.goo.gl/nDB9DnLtb6taeaLRA (26 थमेल भगवती मार्ग, भगवती मंदिर के पास) 😊"
  },
  {
    id: 'hotel_reviews_rating',
    category: 'HOTEL_INFORMATION',
    keywords: [
      'review', 'rating', 'guest review', 'rating kasto cha', 'rating kati ho', 'stars',
      'रेभ्यु', 'रेटिङ', 'कस्तो छ', 'customer review', 'reviews', 'ratings'
    ],
    answerEn: "Hotel Sherpa Soul proudly holds a 4.9 / 5.0 guest review rating from over 128+ verified travelers exploring Nepal 😊!\n\nOur guests consistently highlight:\n• Exceptionally quiet rooms and deep, restful sleep in central Thamel ('No Restaurant. No Noise. Sleep Well.')\n• 24/7 high-pressure hot water showers in modern private bathrooms\n• Warm, authentic Himalayan Sherpa hospitality & trekking assistance\n• Reliable fiber-optic Wi-Fi and clean, comfortable bedding\n\nYou can read verified traveler reviews on our website at https://hotelsherpasoul.com!",
    answerNe: "होटल शेर्पा सोललाई विश्वभरका पाहुनाहरूले १२८+ भन्दा बढी प्रमाणित समीक्षाहरूमा ४.९ / ५.० (4.9/5.0) को उत्कृष्ट रेटिङ दिनुभएको छ 😊!\n\nपाहुनाहरूले विशेषगरी:\n• ठमेलको केन्द्रमा भए पनि कुनै कोलाहल नहुने शान्त वातावरण र मीठो निद्रा ('No Restaurant. No Noise. Sleep Well.')\n• २४ सै घण्टा उच्च प्रेसरको तातो पानीसहितको निजी आधुनिक बाथरुम\n• शेर्पा परिवारको हार्दिक आतिथ्यता र ट्रेकिङ सहयोग\n• कोठाको सफाइ र तीव्र गतिको फाइबर वाइफाइको उच्च प्रशंसा गर्नुभएको छ।\n\nथप समीक्षाहरू हाम्रो आधिकारिक वेबसाइट https://hotelsherpasoul.com मा हेर्न सक्नुहुन्छ!",
    answerHi: "होटल शेरपा सोल को 128+ से अधिक मेहमानों की समीक्षाओं के साथ 4.9/5.0 की उत्कृष्ट रेटिंग प्राप्त है 😊"
  },
  {
    id: 'city_guide_explore',
    category: 'LOCATION',
    keywords: [
      'what to do nearby', 'what to do', 'things to do nearby', 'things to do', 'nearby',
      'nearby attractions', 'attractions', 'attractions nearby', 'sightseeing', 'places to visit',
      'places to visit nearby', 'explore', 'city guide', 'explore thamel', 'explore kathmandu',
      'thamel heritage walk', 'garden of dreams', 'kathmandu durbar square', 'durbar square',
      'ason bazaar', 'swayambhunath', 'monkey temple', 'tarebhir', 'tarebhir hike',
      'nagi gompa', 'jamacho', 'jamacho gompa', 'narayanhiti', 'narayanhiti palace museum',
      'museum of nepali art', 'local temples', 'hikes', 'hike', 'half-day hikes', 'culture',
      'नजिक के छ', 'घुम्ने ठाउँ', 'काठमाडौँ घुम्न', 'ठमेलमा के छ', 'kata ghumnu',
      'ghumnu parne thaun', 'najik k cha', 'k garna sakincha', 'आसपास क्या देखें',
      'घूमने की जगह', 'आसपास क्या करें', 'पास में क्या है'
    ],
    answerEn: "Here is our curated guide to exploring Thamel & Kathmandu right from Hotel Sherpa Soul 😊:\n\nWalking (in Thamel):\n• Garden of Dreams\n• Thamel Heritage Walk\n• Local cafes and trekking shops\n\nWalking (20–40 min):\n• Kathmandu Durbar Square\n• Ason Bazaar\n• Swayambhunath (Monkey Temple)\n\nHalf-day hikes:\n• Tarebhir Hike\n• Nagi Gompa (Shivapuri)\n• Jamacho Gompa\n\nCulture:\n• Narayanhiti Palace Museum\n• Museum of Nepali Art\n• Local temples\n\nOur 24/7 front desk is always happy to provide walking directions, local tips, or help arrange taxi transfers!",
    answerNe: "होटल शेर्पा सोलबाट सजिलै घुम्न सकिने ठमेल तथा काठमाडौँका मुख्य पर्यटकीय स्थलहरू (City Guide) 😊:\n\nWalking (ठमेलभित्रै पैदल):\n• Garden of Dreams (गार्डन अफ ड्रिम्स)\n• Thamel Heritage Walk (ठमेल हेरिटेज वाक)\n• Local cafes and trekking shops (स्थानीय क्याफे तथा ट्रेकिङ पसलहरू)\n\nWalking (२०-४० मिनेट पैदल):\n• Kathmandu Durbar Square (काठमाडौँ दरबार स्क्वायर)\n• Ason Bazaar (असन बजार)\n• Swayambhunath (Monkey Temple / स्वयम्भुनाथ)\n\nHalf-day hikes (आधा-दिने पदयात्रा):\n• Tarebhir Hike (तारेभीर हाइक)\n• Nagi Gompa (Shivapuri / नागी गुम्बा)\n• Jamacho Gompa (जामाचो गुम्बा)\n\nCulture (संस्कृति र सम्पदा):\n• Narayanhiti Palace Museum (नारायणहिटी दरबार सङ्ग्रहालय)\n• Museum of Nepali Art (नेपाली कला सङ्ग्रहालय)\n• Local temples (स्थानीय मन्दिरहरू)\n\nहाम्रो फ्रन्ट डेस्कले यहाँलाई बाटो देखाउन र ट्याक्सी मिलाउन सधैँ सहयोग गर्नेछ!",
    answerHi: "होटल शेरपा सोल से थमेल और काठमांडू घूमने के लिए हमारी सिटी गाइड (City Guide) 😊:\n\nWalking (थमेल में पैदल):\n• Garden of Dreams\n• Thamel Heritage Walk\n• Local cafes and trekking shops\n\nWalking (20–40 मिनट पैदल):\n• Kathmandu Durbar Square\n• Ason Bazaar\n• Swayambhunath (Monkey Temple)\n\nHalf-day hikes (हाइकिंग):\n• Tarebhir Hike\n• Nagi Gompa (Shivapuri)\n• Jamacho Gompa\n\nCulture (संस्कृति और कला):\n• Narayanhiti Palace Museum\n• Museum of Nepali Art\n• Local temples\n\nफ्रंट डेस्क आपको रास्ते और टैक्सी में मदद करने के लिए 24 घंटे उपलब्ध है!"
  }
];

// Search Grounded Knowledge Base first, then fallback to DB
const CATEGORY_ALIASES: Record<string, string[]> = {
  HOTEL_INFORMATION: ['HOTEL_INFORMATION', 'FACILITIES', 'LOCATION', 'FLOORS'],
  ROOM_AMENITIES: ['ROOM_AMENITIES', 'FACILITIES', 'HOT_WATER', 'WIFI', 'FLOORS'],
  CHECK_OUT: ['CHECK_IN', 'POLICY'],
  CHECK_IN: ['CHECK_IN', 'POLICY'],
  DISCOUNT: ['PAYMENT'],
  PAYMENT: ['PAYMENT'],
  FACILITIES: ['FACILITIES', 'HOTEL_INFORMATION', 'SHARED_KITCHEN', 'FLOORS', 'ELEVATOR'],
  LOCATION: ['LOCATION', 'HOTEL_INFORMATION'],
  POLICY: ['POLICY', 'CHECK_IN', 'COUPLE_FRIENDLY'],
  SAFETY: ['SAFETY', 'POLICY', 'COUPLE_FRIENDLY'],
  LUGGAGE: ['LUGGAGE'],
  TREKKING: ['TREKKING'],
  ROOFTOP: ['ROOFTOP', 'FLOORS'],
  HOT_WATER: ['HOT_WATER', 'ROOM_AMENITIES'],
  WIFI: ['WIFI', 'ROOM_AMENITIES'],
  TRANSPORTATION: ['TRANSPORTATION'],
  SHARED_KITCHEN: ['SHARED_KITCHEN', 'FACILITIES', 'FLOORS'],
  FLOORS: ['FLOORS', 'ROOM_AMENITIES', 'ELEVATOR'],
  ELEVATOR: ['ELEVATOR', 'FLOORS', 'FACILITIES'],
  COUPLE_FRIENDLY: ['COUPLE_FRIENDLY', 'POLICY', 'SAFETY'],
  BOOKING_CONFIRMATION: ['BOOKING_CONFIRMATION', 'PAYMENT', 'CHECK_IN'],
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
export function formatRoomPricesMessage(rates: GroundedKnowledge['roomPrices'], lang: string = 'en'): string {
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

  if (lang === 'zh-CN' || lang === 'zh-TW') {
    return `我们目前的客房类型与直订起步价格如下：
• 豪华房 (Deluxe Room) — USD ${rates.deluxe}/晚 — 配备空调 (AC)，适合 2 位成人 + 1 位儿童
• 经济家庭房 (Budget Family Room) — USD ${rates.budgetFamily}/晚 — 无空调（配风扇，其他设施与豪华房相同），适合 3 位成人 + 1 位儿童
• 豪华家庭房 (Family Room) — USD ${rates.family}/晚 — 配备空调 (AC)，宽敞布局适合 3 位成人 + 1 位儿童

✨ 长期住宿特权（免费共用厨房）：
对于入住 2 周（14 晚）或以上的宾客，我们位于 102 号房的设备齐全共用厨房 (Shared Kitchen) 完全免费提供！

如果您告知我们您的旅行日期和入住人数，我将为您查询房间空余情况 😊`;
  }

  if (lang === 'ja') {
    return `ホテル・シェルパ・ソウルの現在の客室タイプと料金は以下の通りです：
• デラックスルーム (Deluxe Room) — 1泊 USD ${rates.deluxe} — エアコン (AC) 完備、大人2名様＋子供1名様まで
• バジェットファミリールーム (Budget Family Room) — 1泊 USD ${rates.budgetFamily} — ノンエアコン（扇風機付、他設備共通）、大人3名様＋子供1名様まで
• ファミリールーム (Family Room) — 1泊 USD ${rates.family} — エアコン (AC) 完備、広々としたお部屋、大人3名様＋子供1名様まで

✨ 長期滞在特別特典（無料の共用キッチン）：
2週間（14泊）以上ご滞在のお客様には、102号室の共用キッチン（Shared Kitchen）を完全無料でご利用いただけます！

ご旅行の日程と人数をお知らせいただければ、空室状況をお調べいたします 😊`;
  }

  if (lang === 'fr') {
    return `Nos catégories de chambres actuelles et tarifs directs sont les suivants :
• Chambre Deluxe (Deluxe Room) — USD ${rates.deluxe}/nuit — avec climatisation (AC), jusqu'à 2 adultes + 1 enfant
• Chambre Familiale Budget (Budget Family Room) — USD ${rates.budgetFamily}/nuit — sans climatisation (avec ventilateur), jusqu'à 3 adultes + 1 enfant
• Chambre Familiale (Family Room) — USD ${rates.family}/nuit — avec climatisation (AC), spacieuse jusqu'à 3 adultes + 1 enfant

✨ Avantage spécial long séjour (Cuisine commune GRATUITE) :
Pour les séjours de 2 semaines (14 nuits) ou plus, notre cuisine partagée entièrement équipée (Chambre 102) est mise à disposition entièrement GRATUITEMENT !

Indiquez-nous vos dates de voyage et le nombre de personnes pour vérifier la disponibilité 😊`;
  }

  if (lang === 'es') {
    return `Nuestras categorías de habitaciones y tarifas directas son las siguientes:
• Habitación Deluxe (Deluxe Room) — USD ${rates.deluxe}/noche — con aire acondicionado (AC), hasta 2 adultos + 1 niño
• Habitación Familiar Económica (Budget Family Room) — USD ${rates.budgetFamily}/noche — sin aire acondicionado (con ventilador), hasta 3 adultos + 1 niño
• Habitación Familiar (Family Room) — USD ${rates.family}/noche — con aire acondicionado (AC), espaciosa hasta 3 adultos + 1 niño

✨ Ventaja especial para estancias largas (Cocina compartida GRATIS):
Para estancias de 2 semanas (14 noches) o más, ¡ofrecemos nuestra cocina compartida (Habitación 102) completamente GRATIS!

Si nos indica sus fechas de viaje y número de huéspedes, comprobaré la disponibilidad para usted 😊`;
  }

  return `Our current room categories and starting rates are:
• Deluxe Room — USD ${rates.deluxe}/night — with Air Conditioning (AC), up to 2 adults + 1 child
• Budget Family Room — USD ${rates.budgetFamily}/night — Non-AC (with fan; all other amenities same as Deluxe/Family), up to 3 adults + 1 child
• Family Room — USD ${rates.family}/night — with Air Conditioning (AC), spacious layout up to 3 adults + 1 child

✨ Long-Stay Special Perk (FREE Shared Kitchen):
For guests staying 2 weeks (14 nights) or more, we provide our fully equipped Shared Kitchen (Room 102) completely FREE of charge!

If you share your travel dates and number of guests, I can check room availability for you 😊`;
}
