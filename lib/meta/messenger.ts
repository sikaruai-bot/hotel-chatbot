export interface SendMessengerOptions {
  recipientId: string;
  text: string;
  quickReplies?: string[];
}

export async function sendMessengerMessage(options: SendMessengerOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!token || token.startsWith('mock_')) {
    const maskedId = options.recipientId.length > 4 ? `${options.recipientId.slice(0, 3)}****` : '****';
    console.log(`[MESSENGER MOCK DISPATCH] Recipient: ${maskedId} | Msg len: ${options.text?.length || 0} | Quick Replies: ${options.quickReplies?.join(', ')}`);
    return { success: true, messageId: `mock_fb_${Date.now()}` };
  }

  try {
    const payload: any = {
      recipient: { id: options.recipientId },
      message: { text: options.text },
    };

    if (options.quickReplies && options.quickReplies.length > 0) {
      payload.message.quick_replies = options.quickReplies.map((title, i) => ({
        content_type: 'text',
        title: title.slice(0, 20),
        payload: `QR_${i}`,
      }));
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Messenger API Error:', data?.error?.message || data?.error?.code || 'API error');
      return { success: false, error: data?.error?.message || 'Failed to send Messenger message' };
    }

    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    console.error('Messenger Send Error:', error?.message || 'Network error');
    return { success: false, error: error.message };
  }
}
