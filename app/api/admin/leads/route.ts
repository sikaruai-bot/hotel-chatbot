import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');

    const where: any = {};
    if (status && status !== 'ALL') where.leadStatus = status;
    if (channel && channel !== 'ALL') where.channel = channel;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        customer: true,
        assignedStaff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, leadStatus, notes, assignedStaffId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(leadStatus ? { leadStatus } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(assignedStaffId ? { assignedStaffId } : {}),
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
