// lib/engine/fallbackMessages.ts
/**
 * Safe-fallback reply strings for each supported language.
 * Used when the KB cannot answer the user question or an out-of-KB query occurs,
 * ensuring zero hallucination and clear human handover escalation.
 */
export const FALLBACKS: Record<string, string> = {
  ne: 'म यो पक्का भन्न सक्दिनँ। हाम्रो front desk staff लाई जोड्छु।',
  en: 'I can’t confirm that. Let me connect you with our front desk staff.',
  hi: 'मैं यह निश्चित नहीं कर सकता। मैं आपको हमारे फ्रंट डेस्क स्टाफ से जोड़ता हूँ।',
  'zh-CN': '我无法确认。让我为您连接前台工作人员。',
  'zh-TW': '我無法確認。讓我為您連接前台工作人員。',
  ja: '確実にお答えできません。フロントデスクのスタッフにおつなぎします。',
  ko: '확실히 말씀드릴 수 없습니다. 프런트 데스크 직원에게 연결해드리겠습니다.',
  fr: 'Je ne peux pas confirmer cela. Je vous mets en relation avec notre personnel de réception.',
  de: 'Ich kann das nicht bestätigen. Ich verbinde Sie mit unserem Front-Desk-Personal.',
  es: 'No puedo confirmarlo. Permítame conectarle con nuestro personal de recepción.',
  it: 'Non posso confermare. La metto in contatto con il nostro staff alla reception.',
  ru: 'Я не могу подтвердить. Позвольте связать вас с сотрудниками стойки регистрации.',
  ar: 'لا يمكنني التأكد من ذلك. سأتواصل مع موظفي الاستقبال.',
  th: 'ฉันไม่สามารถยืนยันได้ ให้ฉันเชื่อมต่อคุณกับพนักงานหน้าเคาน์เตอร์',
  vi: 'Tôi không thể xác nhận. Để tôi kết nối bạn với nhân viên lễ tân.',
  default: 'I can’t confirm that. Let me connect you with our front desk staff.',
};

/**
 * Returns safe fallback in the specified language, falling back to English if unsupported.
 */
export function getFallbackMessage(lang?: string): string {
  if (!lang) return FALLBACKS.en;
  return FALLBACKS[lang] || FALLBACKS[lang.toLowerCase()] || FALLBACKS.default;
}
