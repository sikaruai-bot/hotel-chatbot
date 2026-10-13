import { NextRequest, NextResponse } from 'next/server';
import { processInboundMessage } from '@/lib/engine/chatDispatcher';
import { prisma } from '@/lib/prisma';
import { createVisitorSessionToken, verifyVisitorSessionToken } from '@/lib/auth/visitorSession';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token, x-conversation-id',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/chat/website
 * Fetches message history strictly for the authenticated visitor conversation session.
 * Requires a valid session token (via query param `?token=` or header `x-session-token`).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || req.headers.get('x-session-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Session token required to view conversation history' },
        { status: 401, headers: corsHeaders }
      );
    }

    const verification = verifyVisitorSessionToken(token);
    if (!verification.isValid || !verification.conversationId) {
      return NextResponse.json(
        { error: 'Invalid or expired session token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: verification.conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation || conversation.channel !== 'WEBSITE') {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        conversationId: conversation.id,
        status: conversation.status,
        mode: conversation.mode,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          sender: m.direction === 'INBOUND' ? 'guest' : 'bot',
          text: m.content,
          createdAt: m.createdAt,
        })),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('Website chat GET history error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve conversation history' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/chat/website
 * Ingests a website visitor message.
 * Scoped strictly to verified conversation ID.
 * Issues signed visitor session token for new conversations.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, name, phone, email } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine conversationId and sessionToken from body or headers
    const rawConversationId = body.conversationId || req.headers.get('x-conversation-id');
    const rawSessionToken = body.sessionToken || req.headers.get('x-session-token');

    let validatedConversationId: string | undefined = undefined;

    if (rawConversationId) {
      // Client supplied a conversationId - MUST be authenticated by matching sessionToken
      if (!rawSessionToken) {
        return NextResponse.json(
          { error: 'Session token required when specifying conversationId' },
          { status: 401, headers: corsHeaders }
        );
      }

      const verification = verifyVisitorSessionToken(rawSessionToken);
      if (!verification.isValid || verification.conversationId !== rawConversationId) {
        return NextResponse.json(
          { error: 'Invalid or forged conversation session token' },
          { status: 401, headers: corsHeaders }
        );
      }

      // Verify conversation exists and is scoped to WEBSITE
      const existing = await prisma.conversation.findUnique({
        where: { id: rawConversationId },
      });

      if (!existing || existing.channel !== 'WEBSITE') {
        return NextResponse.json(
          { error: 'Conversation not found or invalid channel' },
          { status: 404, headers: corsHeaders }
        );
      }

      validatedConversationId = existing.id;
    }

    // Process inbound message through chat engine
    const result = await processInboundMessage({
      channel: 'WEBSITE',
      conversationId: validatedConversationId,
      senderId: validatedConversationId ? `web_session_${validatedConversationId}` : `web_guest_${Date.now()}`,
      senderName: name || 'Valued Guest',
      senderPhone: phone,
      senderEmail: email,
      content: message,
      messageType: 'TEXT',
    });

    const activeConversationId = result.conversationId || validatedConversationId;
    if (!activeConversationId) {
      throw new Error('Failed to establish or retrieve active conversation');
    }

    // Generate or reuse signed token
    const sessionToken = rawSessionToken && validatedConversationId
      ? rawSessionToken
      : createVisitorSessionToken(activeConversationId);

    return NextResponse.json(
      {
        reply: result.reply,
        suggestedReplies: result.outbound?.suggestedReplies || [],
        intent: result.outbound?.intent,
        status: 'OPEN',
        mode: 'BOT',
        customerId: result.customerId,
        conversationId: activeConversationId,
        sessionToken,
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
