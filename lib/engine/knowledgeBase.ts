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
        whatsapp: settingsMap['hotel_whatsapp'] || '+977-9851068219',
        email: settingsMap['hotel_email'] || 'info@hotelsherpasoul.com',
      },
      bookingLinks: {
        direct: settingsMap['booking_direct_url'] || 'https://www.hotelsherpasoul.com',
        whatsapp: settingsMap['whatsapp_direct_url'] || 'https://wa.me/9779851068219',
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
        whatsapp: '+977-9851068219',
        email: 'info@hotelsherpasoul.com',
      },
      bookingLinks: { direct: 'https://www.hotelsherpasoul.com' },
    };
  }
}

// Search Knowledge Base in DB for relevant answers
export async function searchKnowledgeBase(query: string, category?: string): Promise<string | null> {
  try {
    const qLower = query.toLowerCase();
    const entries = await prisma.knowledgeBase.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
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

    return null;
  } catch (err) {
    console.error('KB Search Error:', err);
    return null;
  }
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
