import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';
import { detectLanguage } from '../lib/engine/intentDetector';
import { getMessageLanguage, translateIfNeeded } from '../lib/engine/language';
import { FALLBACKS, getFallbackMessage } from '../lib/engine/fallbackMessages';
import { generateGroundedAnswer } from '../lib/engine/ragAnswerGenerator';
import { processInboundMessage } from '../lib/engine/chatDispatcher';
import { generateEmailReplyDraft } from '../lib/engine/guestJourney';
import {
  recordMessageLanguage,
  getConversationCurrentLanguage,
  getConversationPreviousLanguage,
  getConversationMetadata,
  clearConversationMetadata,
} from '../lib/engine/conversationMetadata';
import { maskEmail, maskPhoneNumber } from '../lib/masking';
import { ParsedEmailMessage } from '../lib/email/types';

export async function runMultilingualTests(assert: (cond: boolean, name: string, detail?: string) => void) {
  console.log('\n[TEST GROUP 11: Multilingual Detection & Omni-Channel Replies (14 Mandatory Scenarios)]');

  // Activate feature flag for test execution
  process.env.ENABLE_MULTILINGUAL = 'true';

  // --------------------------------------------------------------------------
  // Scenario 1: Nepali message → Nepali reply
  // --------------------------------------------------------------------------
  const senderNe = `+9779841${Math.floor(100000 + Math.random() * 900000)}`;
  const resNe = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: senderNe,
    senderPhone: senderNe,
    senderName: 'Bikash Thapa',
    content: 'नमस्ते, डिलक्स कोठाको मूल्य कति हो?',
    externalMessageId: `wa_multi_ne_${Date.now()}`,
  });
  assert(resNe.success === true, 'Scenario 1: Nepali message processed successfully');
  assert(
    Boolean(resNe.reply?.includes('USD 20') && (resNe.reply?.includes('डिलक्स') || resNe.reply?.includes('हाम्रो'))),
    'Scenario 1: Nepali reply generated with grounded rate USD 20',
    resNe.reply?.slice(0, 80)
  );

  // --------------------------------------------------------------------------
  // Scenario 2: English message → English reply
  // --------------------------------------------------------------------------
  const senderEn = `+1202555${Math.floor(1000 + Math.random() * 9000)}`;
  const resEn = await processInboundMessage({
    channel: 'WEBSITE',
    senderId: `web_en_${Date.now()}`,
    senderName: 'Sarah Jenkins',
    content: 'Hello, how much are your room prices per night?',
    externalMessageId: `web_multi_en_${Date.now()}`,
  });
  assert(resEn.success === true, 'Scenario 2: English message processed successfully');
  assert(
    Boolean(resEn.reply?.includes('Deluxe Room') && resEn.reply?.includes('USD 20')),
    'Scenario 2: English reply generated with grounded rate USD 20'
  );

  // --------------------------------------------------------------------------
  // Scenario 3: Chinese message → Chinese reply
  // --------------------------------------------------------------------------
  const senderZh = `+86138${Math.floor(10000000 + Math.random() * 90000000)}`;
  const resZh = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: senderZh,
    senderPhone: senderZh,
    senderName: 'Zhang Wei',
    content: '你好，请问豪华房每晚多少钱？有空调吗？',
    externalMessageId: `wa_multi_zh_${Date.now()}`,
  });
  assert(resZh.success === true, 'Scenario 3: Chinese message processed successfully');
  assert(
    Boolean(resZh.reply?.includes('豪华房') && resZh.reply?.includes('20')),
    'Scenario 3: Chinese reply generated with grounded rate USD 20',
    resZh.reply?.slice(0, 80)
  );

  // --------------------------------------------------------------------------
  // Scenario 4: Japanese message → Japanese reply
  // --------------------------------------------------------------------------
  const senderJa = `+8190${Math.floor(10000000 + Math.random() * 90000000)}`;
  const resJa = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: senderJa,
    senderPhone: senderJa,
    senderName: 'Kenji Sato',
    content: 'こんにちは、デラックスルームの1泊の料金を教えてください。',
    externalMessageId: `wa_multi_ja_${Date.now()}`,
  });
  assert(resJa.success === true, 'Scenario 4: Japanese message processed successfully');
  assert(
    Boolean(resJa.reply?.includes('デラックスルーム') && resJa.reply?.includes('20')),
    'Scenario 4: Japanese reply generated with grounded rate USD 20',
    resJa.reply?.slice(0, 80)
  );

  // --------------------------------------------------------------------------
  // Scenario 5: Mixed Nepali-English → dominant language reply
  // --------------------------------------------------------------------------
  const mixedNe = 'I need help with मेरो कोठा बुकिङ र मिति';
  const dominantLangNe = await getMessageLanguage(mixedNe);
  assert(dominantLangNe === 'ne', 'Scenario 5A: Mixed input with strong Nepali markers detects Nepali');

  const mixedEn = 'Hello, I want to book a deluxe room for two nights tapai ko hotel ma';
  const dominantLangEn = await getMessageLanguage(mixedEn);
  assert(dominantLangEn === 'en', 'Scenario 5B: Mixed input with predominantly English words detects English');

  // --------------------------------------------------------------------------
  // Scenario 6: Mid-conversation language switch → bot switches
  // --------------------------------------------------------------------------
  const switchUser = `switch_user_${Date.now()}`;
  // Turn 1: English
  const turn1 = await processInboundMessage({
    channel: 'WEBSITE',
    senderId: switchUser,
    senderName: 'Alex Multilingual',
    content: 'Hi! Do you have wifi in the hotel rooms?',
    externalMessageId: `sw_1_${Date.now()}`,
  });
  assert(Boolean(turn1.reply?.toLowerCase().includes('wi-fi') || turn1.reply?.toLowerCase().includes('wifi')), 'Scenario 6: Turn 1 in English replies in English');

  // Turn 2: Switch to Nepali
  const turn2 = await processInboundMessage({
    channel: 'WEBSITE',
    senderId: switchUser,
    conversationId: turn1.conversationId,
    content: 'अनि २४ सै घण्टा तातो पानी छ कि छैन?',
    externalMessageId: `sw_2_${Date.now()}`,
  });
  assert(
    Boolean(turn2.reply?.includes('हजुर') || turn2.reply?.includes('तातो पानी') || turn2.reply?.includes('निःशुल्क')),
    'Scenario 6: Mid-conversation switch to Nepali receives immediate Nepali reply'
  );

  // Turn 3: Switch to Chinese
  const turn3 = await processInboundMessage({
    channel: 'WEBSITE',
    senderId: switchUser,
    conversationId: turn1.conversationId,
    content: '请问酒店有免费的行李寄存服务吗？',
    externalMessageId: `sw_3_${Date.now()}`,
  });
  assert(
    Boolean(turn3.reply?.includes('行李寄存') || turn3.reply?.includes('免费') || turn3.reply?.includes('Hotel Sherpa Soul')),
    'Scenario 6: Mid-conversation switch to Chinese receives immediate Chinese reply'
  );

  // --------------------------------------------------------------------------
  // Scenario 7: Short ambiguous input → context-based language or English fallback
  // --------------------------------------------------------------------------
  const langWithContext = await getMessageLanguage('OK', 'ne');
  assert(langWithContext === 'ne', 'Scenario 7A: Short ambiguous token "OK" with Nepali context resolves to Nepali');

  const langWithContextJa = await getMessageLanguage('yes', 'ja');
  assert(langWithContextJa === 'ja', 'Scenario 7B: Short ambiguous token "yes" with Japanese context resolves to Japanese');

  const langWithoutContext = await getMessageLanguage('OK', undefined);
  assert(langWithoutContext === 'en', 'Scenario 7C: Short ambiguous token without prior context defaults safely to English');

  // --------------------------------------------------------------------------
  // Scenario 8: KB-grounded answer in a non-English language
  // --------------------------------------------------------------------------
  const groundedZh = await generateGroundedAnswer({
    query: '徒步期间可以寄存行李吗？',
    targetLang: 'zh-CN',
    intent: 'LUGGAGE',
  });
  assert(groundedZh.isGrounded === true, 'Scenario 8A: Chinese luggage query is grounded in KB');
  assert(groundedZh.reply.includes('行李寄存') && groundedZh.reply.includes('免费'), 'Scenario 8A: Chinese luggage reply is grounded and factual');

  const groundedFr = await generateGroundedAnswer({
    query: 'Est-ce que je peux cuisiner dans la chambre 102 ?',
    targetLang: 'fr',
    intent: 'SHARED_KITCHEN',
  });
  assert(groundedFr.isGrounded === true, 'Scenario 8B: French shared kitchen query is grounded in KB');
  assert(
    groundedFr.reply.includes('102') && (groundedFr.reply.includes('2 semaines') || groundedFr.reply.includes('14 nuits')),
    'Scenario 8B: French kitchen reply strictly enforces Room 102 2-week minimum stay rule'
  );

  // --------------------------------------------------------------------------
  // Scenario 9: Out-of-KB question in a non-English language → safe fallback in that language
  // --------------------------------------------------------------------------
  const outOfKbJa = await generateGroundedAnswer({
    query: 'ヘリコプターの操縦方法を教えてください',
    targetLang: 'ja',
    intent: 'OTHER',
  });
  assert(outOfKbJa.isGrounded === false, 'Scenario 9A: Out-of-KB Japanese query marked ungrounded');
  assert(outOfKbJa.reply === FALLBACKS.ja, 'Scenario 9A: Out-of-KB query returns Japanese safe fallback');

  const outOfKbEs = getFallbackMessage('es');
  assert(outOfKbEs === FALLBACKS.es, 'Scenario 9B: Out-of-KB query returns Spanish safe fallback');

  const outOfKbNe = getFallbackMessage('ne');
  assert(outOfKbNe === FALLBACKS.ne, 'Scenario 9C: Out-of-KB query returns Nepali safe fallback');

  // --------------------------------------------------------------------------
  // Scenario 10: Email in French → French draft
  // --------------------------------------------------------------------------
  const frenchEmail: ParsedEmailMessage = {
    messageId: `em_fr_${Date.now()}`,
    fromEmail: 'jean.dupont@paris-travel.fr',
    fromName: 'Jean Dupont',
    to: ['info@hotelsherpasoul.com'],
    subject: 'Demande de tarif et réservation pour chambre familiale à Katmandou',
    textBody: 'Bonjour, quel est le prix pour une chambre familiale au mois de novembre ? Merci beaucoup.',
    headers: {},
    attachments: [],
    authResults: { spf: 'pass', dkim: 'pass', dmarc: 'pass' },
    receivedAt: new Date(),
  };

  const emailDraft = await generateEmailReplyDraft(frenchEmail);
  assert(emailDraft.isDraftOnly === true, 'Scenario 10: Email reply is strictly draft-only (human-in-the-loop)');
  assert(emailDraft.requiresStaffApproval === true, 'Scenario 10: Email reply requires staff approval');
  assert(emailDraft.subject.includes('[FR]'), 'Scenario 10: Email draft subject contains [FR] language tag', emailDraft.subject);
  assert(
    Boolean(emailDraft.text.includes("Merci d'avoir contacté l'Hôtel Sherpa Soul") || emailDraft.text.includes('Chambre Double Deluxe')),
    'Scenario 10: Email draft body generated in French with grounded hotel facts'
  );

  // --------------------------------------------------------------------------
  // Scenario 11: WhatsApp in Chinese → Chinese reply
  // --------------------------------------------------------------------------
  const waSenderZh = `+86139${Math.floor(10000000 + Math.random() * 90000000)}`;
  const waResZh = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: waSenderZh,
    senderPhone: waSenderZh,
    senderName: 'Li Na',
    content: '你好！我想问一下酒店靠近泰米尔中心吗？',
    externalMessageId: `wa_inbound_zh_${Date.now()}`,
  });
  assert(waResZh.success === true, 'Scenario 11: WhatsApp Chinese inquiry processed successfully');
  assert(Boolean(waResZh.reply && waResZh.reply.length > 10), 'Scenario 11: WhatsApp Chinese reply generated');

  // --------------------------------------------------------------------------
  // Scenario 12: Language tag stored in CRM
  // --------------------------------------------------------------------------
  if (resZh.conversationId) {
    const dbConvZh = await prisma.conversation.findUnique({
      where: { id: resZh.conversationId },
    });
    assert(dbConvZh?.language === 'zh-CN', 'Scenario 12A: Chinese language tag stored in Prisma conversation record');
  }

  const metaRecord = getConversationMetadata(resZh.conversationId || '');
  assert(metaRecord?.currentLanguage === 'zh-CN', 'Scenario 12B: Language stored in runtime conversation metadata tracker');

  // --------------------------------------------------------------------------
  // Scenario 13: No hallucination in any language
  // --------------------------------------------------------------------------
  // Ensure Deluxe rate is $20, Family is $30, Budget is $20 across all language generators
  const zhRates = await generateGroundedAnswer({ query: 'prices', targetLang: 'zh-CN', intent: 'ROOM_PRICE' });
  assert(zhRates.reply.includes('20') && zhRates.reply.includes('30'), 'Scenario 13A: Chinese rates are strictly USD 20 and 30');

  const jaRates = await generateGroundedAnswer({ query: 'rates', targetLang: 'ja', intent: 'ROOM_PRICE' });
  assert(jaRates.reply.includes('20') && jaRates.reply.includes('30'), 'Scenario 13B: Japanese rates are strictly USD 20 and 30');

  const frRates = await generateGroundedAnswer({ query: 'prix', targetLang: 'fr', intent: 'ROOM_PRICE' });
  assert(frRates.reply.includes('20') && frRates.reply.includes('30'), 'Scenario 13C: French rates are strictly USD 20 and 30');

  // Check-in time remains 12:00 PM flexible
  assert(
    Boolean(emailDraft.text.includes('12h00') || emailDraft.text.includes('12:00')),
    'Scenario 13D: Check-in policy strictly 12:00 PM across languages'
  );

  // --------------------------------------------------------------------------
  // Scenario 14: No PII exposure
  // --------------------------------------------------------------------------
  const maskedPhoneTest = maskPhoneNumber('+9779818259472');
  assert(maskedPhoneTest === '+9779****472', 'Scenario 14A: Phone number masked in outbound logging');

  const maskedEmailTest = maskEmail('mingma.sherpa@hotelsherpasoul.com');
  assert(maskedEmailTest === 'mi***@hotelsherpasoul.com', 'Scenario 14B: Email address masked in outbound logging');

  // Reset feature flag to safe default (false)
  delete process.env.ENABLE_MULTILINGUAL;
}
