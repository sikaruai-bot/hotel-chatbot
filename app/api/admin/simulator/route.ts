import { NextRequest, NextResponse } from 'next/server';
import { processInboundMessage } from '@/lib/engine/chatDispatcher';
import { Channel } from '@/lib/engine/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel, senderId, senderName, senderPhone, content, campaign } = body;

    if (!content || !channel) {
      return NextResponse.json({ error: 'channel and content are required' }, { status: 400 });
    }

    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await processInboundMessage({
      channel: channel as Channel,
      senderId: senderId || `user_${Date.now()}`,
      senderName: senderName || 'Test Guest',
      senderPhone: senderPhone || '+9779811223344',
      content,
      externalMessageId: messageId,
      messageType: 'TEXT',
      campaignInfo: campaign ? { campaign } : undefined,
    });

    return NextResponse.json({
      success: true,
      simulatedMessageId: messageId,
      botReply: result.reply,
      outbound: result.outbound,
    });
  } catch (err: any) {
    console.error('Simulator error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
