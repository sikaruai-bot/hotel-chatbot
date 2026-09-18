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

    if (!verifyMetaSignature(rawBody, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const data = JSON.parse(rawBody);

    if (data.object === 'page' && data.entry) {
      for (const entry of data.entry) {
        for (const messagingItem of entry.messaging || []) {
          const senderId = messagingItem.sender?.id;
          const messageId = messagingItem.message?.mid;
          const text = messagingItem.message?.text || messagingItem.message?.quick_reply?.payload;

          if (senderId && text) {
            await processInboundMessage({
              channel: 'MESSENGER',
              senderId,
              content: text,
              externalMessageId: messageId,
              messageType: messagingItem.message?.quick_reply ? 'QUICK_REPLY' : 'TEXT',
              rawPayload: messagingItem,
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error) {
    console.error('Messenger Webhook Error:', error);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
