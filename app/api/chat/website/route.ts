import { NextRequest, NextResponse } from 'next/server';
import { processInboundMessage } from '@/lib/engine/chatDispatcher';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, name, phone, email, message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400, headers: corsHeaders }
      );
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

    return NextResponse.json(
      {
        reply: result.reply,
        suggestedReplies: result.outbound?.suggestedReplies || [],
        intent: result.outbound?.intent,
        status: conv?.status || 'OPEN',
        mode: conv?.mode || 'BOT',
        customerId: conv?.customerId,
        conversationId: conv?.id,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('Website chat API error:', err);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500, headers: corsHeaders }
    );
  }
}
