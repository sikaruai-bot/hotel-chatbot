import { NextRequest, NextResponse } from 'next/server';
import { processInboundMessage } from '@/lib/engine/chatDispatcher';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, name, phone, email, message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Resolve or find customer
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      if (phone) {
        const found = await prisma.customer.findFirst({ where: { phone } });
        if (found) resolvedCustomerId = found.id;
      }
    }

    const result = await processInboundMessage({
      channel: 'WEBSITE',
      senderId: resolvedCustomerId || 'web_guest_' + Date.now(),
      senderName: name || 'Website Visitor',
      senderPhone: phone,
      senderEmail: email,
      content: message,
      messageType: 'TEXT',
    });

    // Fetch latest active conversation for return data
    const conv = await prisma.conversation.findFirst({
      where: { channel: 'WEBSITE' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, customerId: true, status: true, mode: true },
    });

    return NextResponse.json({
      reply: result.reply,
      suggestedReplies: result.outbound?.suggestedReplies || [],
      intent: result.outbound?.intent,
      status: conv?.status || 'OPEN',
      mode: conv?.mode || 'BOT',
      customerId: conv?.customerId,
      conversationId: conv?.id,
    });
  } catch (err: any) {
    console.error('Website chat API error:', err);
    return NextResponse.json({ error: 'Failed to process message', detail: err?.message || String(err), stack: err?.stack }, { status: 500 });
  }
}
