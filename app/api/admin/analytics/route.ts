import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const totalLeads = await prisma.lead.count();
    const newLeads = await prisma.lead.count({ where: { leadStatus: 'NEW' } });
    const qualifiedLeads = await prisma.lead.count({ where: { leadStatus: 'QUALIFIED' } });
    const highIntentLeads = await prisma.lead.count({ where: { leadStatus: 'HIGH_INTENT' } });
    const bookingRequests = await prisma.lead.count({ where: { leadStatus: 'BOOKING_REQUEST' } });
    const confirmedLeads = await prisma.lead.count({ where: { leadStatus: 'CONFIRMED' } });

    const totalConversations = await prisma.conversation.count();
    const humanHandovers = await prisma.conversation.count({
      where: { status: 'HUMAN_REQUIRED' },
    });

    // Channel breakdown
    const channels = ['WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'WEBSITE', 'META_LEAD_ADS'];
    const channelCounts: Record<string, number> = {};
    for (const ch of channels) {
      channelCounts[ch] = await prisma.lead.count({ where: { channel: ch } });
    }

    // Room inquiry preference
    const deluxeInquiries = await prisma.lead.count({ where: { roomType: 'Deluxe Room' } });
    const budgetFamilyInquiries = await prisma.lead.count({ where: { roomType: 'Budget Family Room' } });
    const familyInquiries = await prisma.lead.count({ where: { roomType: 'Family Room' } });

    // Conversion rate
    const conversionRate = totalLeads > 0 ? ((confirmedLeads + bookingRequests) / totalLeads) * 100 : 0;

    return NextResponse.json({
      metrics: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        highIntentLeads,
        bookingRequests,
        confirmedLeads,
        totalConversations,
        humanHandovers,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      channels: channelCounts,
      roomPreferences: {
        deluxe: deluxeInquiries,
        budgetFamily: budgetFamilyInquiries,
        family: familyInquiries,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
