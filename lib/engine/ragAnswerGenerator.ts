// lib/engine/ragAnswerGenerator.ts
import { getFallbackMessage } from './fallbackMessages';
import { getGroundedKnowledge, searchKnowledgeBase } from './knowledgeBase';

export interface GroundedAnswerOptions {
  query: string;
  targetLang: string;
  intent?: string;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
}

export interface GroundedAnswerResult {
  reply: string;
  isGrounded: boolean;
  source: 'KB' | 'FALLBACK';
  language: string;
}

/**
 * Multilingual Grounded Answer Generator.
 * Generates responses in the user's detected target language, strictly grounded in the
 * hotel knowledge base facts (USD 20/30 rates, Room 102 shared kitchen 2-week rule, check-in 12pm, etc.)
 * If the question is outside the hotel's verified knowledge base, returns a safe fallback in that language.
 */
export async function generateGroundedAnswer(
  options: GroundedAnswerOptions
): Promise<GroundedAnswerResult> {
  const { query, targetLang = 'en', intent, roomType, checkIn, checkOut } = options;
  const lang = targetLang || 'en';
  const qLower = query.toLowerCase();

  const knowledge = await getGroundedKnowledge();
  const rates = knowledge.roomPrices;

  // 1. Room rates query
  if (intent === 'ROOM_PRICE' || qLower.includes('price') || qLower.includes('rate') || qLower.includes('how much') || qLower.includes('cost') || qLower.includes('tarif') || qLower.includes('prix') || qLower.includes('precio') || qLower.includes('多少钱') || qLower.includes('料金') || qLower.includes('얼마')) {
    if (lang === 'zh-CN' || lang === 'zh-TW') {
      return {
        reply: `我们目前的房型与直订优惠价格如下 😊：\n• 豪华房 (Deluxe Room)：每晚 USD ${rates.deluxe}（配空调、独立卫浴、高速Wi-Fi）\n• 经济家庭房 (Budget Family Room)：每晚 USD ${rates.budgetFamily}（风扇房，适合3位成人+1位儿童）\n• 豪华家庭房 (Family Room)：每晚 USD ${rates.family}（大空间空调房）\n\n✨ 长期入住特权：入住两周（14天）及以上的宾客可完全免费使用102号共用厨房！\n直接向我们预订可享 10% 专属折扣。请问您的入住日期是哪几天呢？`,
        isGrounded: true,
        source: 'KB',
        language: lang,
      };
    }

    if (lang === 'ja') {
      return {
        reply: `ホテル・シェルパ・ソウルの客室料金は以下の通りです 😊：\n• デラックスルーム (Deluxe Room)：1泊 USD ${rates.deluxe}（エアコン、専用バスルーム、高速Wi-Fi完備）\n• バジェットファミリールーム (Budget Family Room)：1泊 USD ${rates.budgetFamily}（ファン付き・大人3名＋子供1名まで）\n• ファミリールーム (Family Room)：1泊 USD ${rates.family}（広々としたエアコン付き）\n\n✨ 2週間（14泊）以上のご滞在で、102号室の共用キッチンを完全無料でご利用いただけます！\n直接予約で10%割引が適用されます。日程をお知らせいただければ空室をお調べいたします。`,
        isGrounded: true,
        source: 'KB',
        language: 'ja',
      };
    }

    if (lang === 'fr') {
      return {
        reply: `Voici nos tarifs directs officiels pour l'Hôtel Sherpa Soul 😊 :\n• Chambre Deluxe (Deluxe Room) : USD ${rates.deluxe} / nuit (avec climatisation, salle de bain privée, Wi-Fi rapide)\n• Chambre Familiale Budget (Budget Family Room) : USD ${rates.budgetFamily} / nuit (non-climatisée avec ventilateur)\n• Chambre Familiale (Family Room) : USD ${rates.family} / nuit (climatisée, grand espace)\n\n✨ Avantage long séjour : pour tout séjour de 2 semaines (14 nuits) ou plus, la cuisine partagée (Chambre 102) est entièrement GRATUITE !\nRéduction immédiate de 10% pour toute réservation directe. Souhaitez-vous vérifier les disponibilités pour vos dates ?`,
        isGrounded: true,
        source: 'KB',
        language: 'fr',
      };
    }

    if (lang === 'es') {
      return {
        reply: `Nuestras tarifas oficiales en el Hotel Sherpa Soul son 😊:\n• Habitación Deluxe (Deluxe Room): USD ${rates.deluxe} / noche (con aire acondicionado, baño privado, Wi-Fi de alta velocidad)\n• Habitación Familiar Económica (Budget Family Room): USD ${rates.budgetFamily} / noche (sin aire acondicionado, con ventilador)\n• Habitación Familiar (Family Room): USD ${rates.family} / noche (espaciosa con aire acondicionado)\n\n✨ Estancias largas: ¡Para estancias de 2 semanas (14 noches) o más, la cocina compartida (Habitación 102) es completamente GRATUITA!\nDisfruta de un 10% de descuento por reserva directa. ¿Te gustaría consultar disponibilidad para tus fechas?`,
        isGrounded: true,
        source: 'KB',
        language: 'es',
      };
    }

    if (lang === 'de') {
      return {
        reply: `Unsere aktuellen Zimmerpreise im Hotel Sherpa Soul 😊:\n• Deluxe-Zimmer (Deluxe Room): USD ${rates.deluxe} / Nacht (mit Klimaanlage, eigenem Bad, schnellem WLAN)\n• Budget-Familienzimmer (Budget Family Room): USD ${rates.budgetFamily} / Nacht (mit Deckenventilator)\n• Familienzimmer (Family Room): USD ${rates.family} / Nacht (geräumig mit Klimaanlage)\n\n✨ Langzeit-Vorteil: Ab einem Aufenthalt von 2 Wochen (14 Nächten) ist die Nutzung der Gemeinschaftsküche (Zimmer 102) komplett KOSTENLOS!\n10% Rabatt bei Direktbuchung. Teilen Sie uns gerne Ihre Reisedaten mit!`,
        isGrounded: true,
        source: 'KB',
        language: 'de',
      };
    }

    if (lang === 'ne') {
      return {
        reply: `हाम्रो हालको सुरुवाती दर र कोठाका प्रकारहरू निम्नानुसार छन् 😊:\n• डिलक्स कोठा (Deluxe Room) — USD ${rates.deluxe}/रात — एयर कन्डिसनिङ (AC) सहित\n• बजेट फेमिली कोठा (Budget Family Room) — USD ${rates.budgetFamily}/रात — Non-AC (फ्यानसहित)\n• फेमिली कोठा (Family Room) — USD ${rates.family}/रात — एयर कन्डिसनिङ (AC) सहित फराकिलो कोठा\n\n✨ २ हप्ता (१४ दिन) वा सोभन्दा बढी बस्ने पाहुनाका लागि कोठा १०२ मा साझा भान्सा (Shared Kitchen) बिल्कुल निःशुल्क उपलब्ध छ!\nसिधै बुक गर्दा १०% छुट पनि प्राप्त हुन्छ।`,
        isGrounded: true,
        source: 'KB',
        language: 'ne',
      };
    }

    return {
      reply: `Our current room categories and starting direct rates are 😊:\n• Deluxe Room: USD ${rates.deluxe}/night (with Air Conditioning, attached bathroom, high-speed Wi-Fi)\n• Budget Family Room: USD ${rates.budgetFamily}/night (Non-AC with fan, for up to 3 adults + 1 child)\n• Family Room: USD ${rates.family}/night (Spacious layout with Air Conditioning)\n\n✨ Long-Stay Perk: For stays of 2 weeks (14 nights) or more, our fully equipped Shared Kitchen (Room 102) is completely FREE!\nEnjoy an instant 10% direct booking discount. Would you like to check room availability for your dates?`,
      isGrounded: true,
      source: 'KB',
      language: 'en',
    };
  }

  // 2. Luggage storage
  if (intent === 'LUGGAGE' || qLower.includes('luggage') || qLower.includes('bag') || qLower.includes('trek') || qLower.includes('bagage') || qLower.includes('equipaje') || qLower.includes('行李') || qLower.includes('荷物')) {
    if (lang === 'zh-CN' || lang === 'zh-TW') {
      return {
        reply: '是的！Hotel Sherpa Soul 为所有入住宾客提供免费且安全的行李寄存服务 😊\n您可以在徒步旅行期间（珠峰大本营 EBC、安纳普尔纳等）将大件行李寄存在我们24小时前台，完全免费！',
        isGrounded: true,
        source: 'KB',
        language: lang,
      };
    }
    if (lang === 'ja') {
      return {
        reply: 'はい！ホテル・シェルパ・ソウルでは、ご宿泊のお客様に無料の安全な荷物預かりサービスを提供しております 😊\nトレッキング中（エベレスト、アンナプルナなど）もお荷物を24時間フロントで無料でお預かりいたします。',
        isGrounded: true,
        source: 'KB',
        language: 'ja',
      };
    }
    if (lang === 'fr') {
      return {
        reply: "Oui ! L'Hôtel Sherpa Soul propose un service de bagagerie sécurisé et entièrement gratuit pour tous nos clients 😊\nVous pouvez laisser vos bagages à la réception 24h/24 avant l'enregistrement ou pendant vos treks en montagne (EBC, Annapurna), sans frais supplémentaires !",
        isGrounded: true,
        source: 'KB',
        language: 'fr',
      };
    }
  }

  // 3. Shared kitchen / Room 102 query
  if (intent === 'SHARED_KITCHEN' || qLower.includes('cook') || qLower.includes('kitchen') || qLower.includes('102') || qLower.includes('cuisine') || qLower.includes('cocina') || qLower.includes('厨房') || qLower.includes('キッチン')) {
    if (lang === 'zh-CN' || lang === 'zh-TW') {
      return {
        reply: '关于共用厨房（Room 102）😊：\n入住 2 周（14 晚）或以上的长期宾客，可完全免费使用我们设备齐全的共用厨房（配有迷你冰箱、微波炉、料理台与餐具）。短期入住（少于 14 晚）暂不开放使用。',
        isGrounded: true,
        source: 'KB',
        language: lang,
      };
    }
    if (lang === 'ja') {
      return {
        reply: '102号室の共用キッチンについて 😊：\n2週間（14泊）以上ご滞在の長期宿泊のお客様には、設備の整った共用キッチン（冷蔵庫、電子レンジ、調理器具完備）を完全無料でご利用いただけます。',
        isGrounded: true,
        source: 'KB',
        language: 'ja',
      };
    }
    if (lang === 'fr') {
      return {
        reply: "Concernant la cuisine partagée (Chambre 102) 😊 :\nPour les clients séjournant 2 semaines (14 nuits) ou plus, notre cuisine commune toute équipée est mise à disposition tout à fait GRATUITEMENT. Les séjours de courte durée n'y ont pas accès.",
        isGrounded: true,
        source: 'KB',
        language: 'fr',
      };
    }
  }

  // 4. Check KB dynamic entry
  const kbMatch = await searchKnowledgeBase(query, lang === 'ne' ? 'ne' : lang === 'hi' ? 'hi' : 'en');
  if (kbMatch) {
    return {
      reply: kbMatch,
      isGrounded: true,
      source: 'KB',
      language: lang,
    };
  }

  // 5. Out-of-KB safe fallback in user's detected language (Zero hallucination guardrail)
  return {
    reply: getFallbackMessage(lang),
    isGrounded: false,
    source: 'FALLBACK',
    language: lang,
  };
}
