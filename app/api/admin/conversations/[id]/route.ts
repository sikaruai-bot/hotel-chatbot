import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/meta/whatsapp';
import { sendMessengerMessage } from '@/lib/meta/messenger';
import { sendInstagramMessage } from '@/lib/meta/instagram';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          include: {
            leads: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        state: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Mark unreadStaff as false when viewed
    if (conversation.unreadStaff) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadStaff: false },
      });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, message, status, note } = body;

    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 1. Staff Takeover
    if (action === 'takeover') {
      const updated = await prisma.conversation.update({
        where: { id: params.id },
        data: {
          mode: 'HUMAN',
          status: 'HUMAN_REQUIRED',
        },
      });

      await prisma.message.create({
        data: {
          conversationId: params.id,
          direction: 'OUTBOUND',
          messageType: 'SYSTEM',
          content: 'Staff took over the conversation. Automated replies paused.',
          isStaffReply: true,
        },
      });

      return NextResponse.json({ success: true, mode: 'HUMAN', status: updated.status });
    }

    // 2. Resume Bot
    if (action === 'resume_bot') {
      const updated = await prisma.conversation.update({
        where: { id: params.id },
        data: {
          mode: 'BOT',
          status: 'OPEN',
        },
      });

      await prisma.message.create({
        data: {
          conversationId: params.id,
          direction: 'OUTBOUND',
          messageType: 'SYSTEM',
          content: 'Bot automation resumed by staff.',
          isStaffReply: true,
        },
      });

      return NextResponse.json({ success: true, mode: 'BOT', status: updated.status });
    }

    // 3. Manual Staff Reply
    if (action === 'reply') {
      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
      }

      // Save to database
      const createdMsg = await prisma.message.create({
        data: {
          conversationId: params.id,
          customerId: conv.customerId,
          channel: conv.channel,
          direction: 'OUTBOUND',
          messageType: 'TEXT',
          content: message,
          isStaffReply: true,
          status: 'SENT',
        },
      });

      await prisma.conversation.update({
        where: { id: params.id },
        data: {
          lastMessageAt: new Date(),
          unreadStaff: false,
        },
      });

      // Dispatch to external channel
      if (conv.channel === 'WHATSAPP' && (conv.customer.phone || conv.customer.whatsappId)) {
        const phone = conv.customer.whatsappId || conv.customer.phone!;
        await sendWhatsAppMessage({ to: phone, text: message });
      } else if (conv.channel === 'MESSENGER' && conv.customer.messengerId) {
        await sendMessengerMessage({ recipientId: conv.customer.messengerId, text: message });
      } else if (conv.channel === 'INSTAGRAM' && conv.customer.instagramId) {
        await sendInstagramMessage({ recipientId: conv.customer.instagramId, text: message });
      }

      return NextResponse.json({ success: true, message: createdMsg });
    }

    // 4. Change Status
    if (action === 'change_status' && status) {
      const updated = await prisma.conversation.update({
        where: { id: params.id },
        data: { status },
      });

      return NextResponse.json({ success: true, status: updated.status });
    }

    // 5. Add Note
    if (action === 'add_note' && note) {
      const updated = await prisma.conversation.update({
        where: { id: params.id },
        data: {
          notes: conv.notes ? `${conv.notes}\n• ${note}` : `• ${note}`,
        },
      });

      return NextResponse.json({ success: true, notes: updated.notes });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Staff action error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
