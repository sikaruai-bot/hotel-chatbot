import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        roomType: true,
        reservations: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          },
          orderBy: { checkInDate: 'asc' },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    const roomTypes = await prisma.roomType.findMany();

    return NextResponse.json({ rooms, roomTypes });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load rooms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, roomTypeId, basePriceUsd, roomId, status, notes } = body;

    // 1. Update Room Type Rate
    if (action === 'update_rate' && roomTypeId && basePriceUsd !== undefined) {
      const updated = await prisma.roomType.update({
        where: { id: roomTypeId },
        data: { basePriceUsd: parseFloat(basePriceUsd) },
      });
      return NextResponse.json({ success: true, roomType: updated });
    }

    // 2. Update Room Status (e.g. AVAILABLE, OCCUPIED, CLEANING)
    if (action === 'update_room' && roomId && status) {
      const updated = await prisma.room.update({
        where: { id: roomId },
        data: {
          status,
          ...(notes !== undefined ? { notes } : {}),
        },
      });
      return NextResponse.json({ success: true, room: updated });
    }

    return NextResponse.json({ error: 'Invalid room action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
