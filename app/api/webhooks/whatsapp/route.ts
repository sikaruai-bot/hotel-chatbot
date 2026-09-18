import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookChallenge, verifyMetaSignature } from '@/lib/meta/verification';
import { processInboundMessage } from '@/lib/engine/chatDispatcher';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const result = verifyWebhookChallenge(mode, token, challenge);
  if (result.isValid && result.challenge) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Verify HMAC signature if secret configured
    if (!verifyMetaSignature(rawBody, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const data = JSON.parse(rawBody);

    // Parse WhatsApp Business Cloud API payload
    if (data.object === 'whatsapp_business_account' && data.entry) {
      for (const entry of data.entry) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value?.messages) {
            for (const msg of value.messages) {
              const senderPhone = msg.from; // Sender phone number
              const messageId = msg.id; // WhatsApp Message ID
              const senderName = value.contacts?.[0]?.profile?.name || 'WhatsApp Guest';

              let text = '';
              let messageType: 'TEXT' | 'BUTTON' = 'TEXT';

              if (msg.type === 'text') {
                text = msg.text?.body || '';
              } else if (msg.type === 'interactive' && msg.interactive?.button_reply) {
                text = msg.interactive.button_reply.title || '';
                messageType = 'BUTTON';
              } else if (msg.type === 'button') {
                text = msg.button?.text || '';
                messageType = 'BUTTON';
              }

              if (text) {
                await processInboundMessage({
                  channel: 'WHATSAPP',
                  senderId: senderPhone,
                  senderPhone,
                  senderName,
                  content: text,
                  externalMessageId: messageId,
                  messageType,
                  rawPayload: msg,
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
