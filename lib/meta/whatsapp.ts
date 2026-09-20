export interface SendWhatsAppOptions {
  to: string;
  text: string;
  buttons?: string[];
  templateName?: string;
  templateLanguage?: string;
}

export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = options.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1280352581833442';

  if (!token || !phoneNumberId || token.startsWith('mock_') || phoneNumberId.startsWith('mock_')) {
    console.log(`[WHATSAPP MOCK DISPATCH] To: ${options.to} | Text: "${options.text}" | Buttons: ${options.buttons?.join(', ')}`);
    return { success: true, messageId: `mock_wa_${Date.now()}` };
  }

  try {
    let payload: any;

    if (options.buttons && options.buttons.length > 0 && options.buttons.length <= 3) {
      // Interactive Button Message
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: options.to,
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
        to: options.to,
        type: 'text',
        text: { body: options.text, preview_url: false },
      };
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
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
