export interface SendInstagramOptions {
  recipientId: string;
  text: string;
}

export async function sendInstagramMessage(options: SendInstagramOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token || token.startsWith('mock_')) {
    console.log(`[INSTAGRAM MOCK DISPATCH] Recipient: ${options.recipientId} | Text: "${options.text}"`);
    return { success: true, messageId: `mock_ig_${Date.now()}` };
  }

  try {
    const payload = {
      recipient: { id: options.recipientId },
      message: { text: options.text },
    };

    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Instagram DM API Error:', data);
      return { success: false, error: data.error?.message || 'Failed to send Instagram message' };
    }

    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    console.error('Instagram Send Error:', error);
    return { success: false, error: error.message };
  }
}
