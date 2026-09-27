export interface SendWhatsAppOptions {
  to: string;
  text: string;
  buttons?: string[];
  templateName?: string;
  templateLanguage?: string;
  phoneNumberId?: string;
}

export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = options.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Sanitize recipient phone number: Meta WhatsApp Cloud API requires E.164 digits without '+'
  const cleanPhone = options.to.replace(/\D/g, '');

  if (!token || !phoneNumberId || token.startsWith('mock_') || phoneNumberId.startsWith('mock_')) {
    console.log(`[WHATSAPP MOCK DISPATCH] To: ${cleanPhone || options.to} | Text: "${options.text}" | Buttons: ${options.buttons?.join(', ')}`);
    return { success: true, messageId: `mock_wa_${Date.now()}` };
  }

  if (!cleanPhone) {
    console.error('[WhatsApp Cloud API] Invalid recipient phone number:', options.to);
    return { success: false, error: 'Invalid recipient phone number' };
  }

  try {
    let payload: any;

    if (options.buttons && options.buttons.length > 0 && options.buttons.length <= 3) {
      // Interactive Button Message
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: options.text },
          action: {
            buttons: options.buttons.map((title, i) => ({
              type: 'reply',
              reply: {
                id: `btn_${i}`,
                title: title.slice(0, 20), // WhatsApp button title limit is 20 chars
              },
            })),
          },
        },
      };
    } else {
      // Standard Text Message
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: options.text, preview_url: false },
      };
    }

    let response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data = await response.json();

    // If interactive button message failed, fallback immediately to standard text
    if (!response.ok && payload.type === 'interactive') {
      const fallbackPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: options.text, preview_url: false },
      };
      response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackPayload),
      });
      data = await response.json();
    }

    if (!response.ok) {
      console.error('WhatsApp Cloud API error response:', data);
      return { success: false, error: data.error?.message || 'Failed to send WhatsApp message' };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error: any) {
    console.error('WhatsApp Send Error:', error);
    return { success: false, error: error.message };
  }
}
