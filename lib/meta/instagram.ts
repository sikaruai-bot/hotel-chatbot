export interface SendInstagramOptions {
  recipientId: string;
  text: string;
}

export async function sendInstagramMessage(options: SendInstagramOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token || token.startsWith('mock_')) {
    const maskedId = options.recipientId.length > 4 ? `${options.recipientId.slice(0, 3)}****` : '****';
    console.log(`[INSTAGRAM MOCK DISPATCH] Recipient: ${maskedId} | Msg len: ${options.text?.length || 0}`);
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
      console.error('Instagram DM API Error:', data?.error?.message || data?.error?.code || 'API error');
      return { success: false, error: data?.error?.message || 'Failed to send Instagram message' };
    }

    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    console.error('Instagram Send Error:', error?.message || 'Network error');
    return { success: false, error: error.message };
  }
}
