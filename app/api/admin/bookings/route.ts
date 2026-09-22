import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/meta/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        room: true,
        roomType: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    console.error('Fetch reservations error:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      customerId: inputCustomerId,
      guestName,
      guestPhone,
      guestEmail,
      roomTypeId: inputRoomTypeId,
      roomTypeCode,
      roomId,
      checkInDate,
      checkOutDate,
      adults = 1,
      children = 0,
      totalPriceUsd = 20,
      sendWhatsAppNotification = true,
      notes,
    } = body;

    if (!guestName || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'Guest name, check-in date, and check-out date are required.' },
        { status: 400 }
      );
    }

    // 1. Resolve Customer
    let customerId = inputCustomerId;
    if (!customerId) {
      if (guestPhone) {
        const existing = await prisma.customer.findFirst({
          where: { OR: [{ phone: guestPhone }, { whatsappId: guestPhone }] },
        });
        if (existing) {
          customerId = existing.id;
        }
      }
    }

    if (!customerId) {
      const newCust = await prisma.customer.create({
        data: {
          name: guestName.trim(),
          phone: guestPhone?.trim() || null,
          email: guestEmail?.trim() || null,
          firstChannel: 'ADMIN_APPROVAL',
        },
      });
      customerId = newCust.id;
    }

    // 2. Resolve Room Type
    let matchedRoomType = null;
    if (inputRoomTypeId) {
      matchedRoomType = await prisma.roomType.findUnique({
        where: { id: inputRoomTypeId },
      });
    }

    if (!matchedRoomType) {
      const code = roomTypeCode || 'DELUXE';
      matchedRoomType = await prisma.roomType.findFirst({
        where: {
          OR: [
            { code },
            { name: { contains: code } },
          ],
        },
      });
    }

    if (!matchedRoomType) {
      // Default to Deluxe
      matchedRoomType = await prisma.roomType.findFirst({
        where: { code: 'DELUXE' },
      });
    }

    if (!matchedRoomType) {
      return NextResponse.json({ error: 'Room type not found in database.' }, { status: 400 });
    }

    // 3. Resolve Assigned Room (if provided)
    let assignedRoom = null;
    if (roomId) {
      assignedRoom = await prisma.room.findUnique({
        where: { id: roomId },
      });
    }

    // 4. Generate Unique Booking Code
    const bookingCode = `HSS-${Math.floor(100000 + Math.random() * 900000)}`;

    // Parse Dates safely
    const cIn = new Date(checkInDate);
    const cOut = new Date(checkOutDate);

    // 5. Create Confirmed Reservation in Prisma
    const reservation = await prisma.reservation.create({
      data: {
        bookingCode,
        customerId,
        roomId: assignedRoom?.id || null,
        roomTypeId: matchedRoomType.id,
        guestName: guestName.trim(),
        guestPhone: guestPhone?.trim() || null,
        guestEmail: guestEmail?.trim() || null,
        checkInDate: isNaN(cIn.getTime()) ? new Date() : cIn,
        checkOutDate: isNaN(cOut.getTime()) ? new Date(Date.now() + 86400000) : cOut,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        totalPriceUsd: Number(totalPriceUsd) || matchedRoomType.basePriceUsd,
        status: 'CONFIRMED',
        source: 'DIRECT_WEBSITE',
        notes: notes || (assignedRoom ? `Assigned Room: ${assignedRoom.roomNumber}` : 'Approved by Front Desk'),
      },
      include: {
        room: true,
        roomType: true,
        customer: true,
      },
    });

    // 6. Update Lead Status to CONFIRMED (if leadId provided)
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          leadStatus: 'CONFIRMED',
          conversationStatus: 'CONFIRMED',
          scoreReason: `CONFIRMED BOOKING — Approved by Front Desk (Ref: ${bookingCode})`,
        },
      });
    }

    // 7. Update Customer record with name/phone if missing
    if (guestPhone || guestEmail) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          name: guestName.trim(),
          ...(guestPhone ? { phone: guestPhone.trim() } : {}),
          ...(guestEmail ? { email: guestEmail.trim() } : {}),
        },
      });
    }

    // 8. Send WhatsApp Confirmation Message (if phone available and enabled)
    let whatsappSent = false;
    let whatsappError = undefined;

    if (sendWhatsAppNotification && guestPhone) {
      const cleanPhoneDigits = guestPhone.replace(/[^0-9]/g, '');
      const formattedTo = cleanPhoneDigits.startsWith('977')
        ? cleanPhoneDigits
        : cleanPhoneDigits.length === 10
        ? `977${cleanPhoneDigits}`
        : cleanPhoneDigits;

      const dateStr = `${reservation.checkInDate.toISOString().split('T')[0]} to ${reservation.checkOutDate.toISOString().split('T')[0]}`;
      const roomDisplay = assignedRoom
        ? `${matchedRoomType.name} (Room ${assignedRoom.roomNumber})`
        : matchedRoomType.name;

      const confirmationText = `🎉 Namaste ${guestName}!

Your reservation at Hotel Sherpa Soul is officially APPROVED and CONFIRMED! 😊

━━━━━━━━━━━━━━━━━━
📌 Booking Ref: ${bookingCode}
🏨 Room: ${roomDisplay}
📅 Dates: ${dateStr}
👥 Guests: ${adults} adult(s)${children ? `, ${children} child` : ''}
💰 Total Rate: USD $${reservation.totalPriceUsd} (10% Direct Discount applied)
━━━━━━━━━━━━━━━━━━
✨ Important Guest Information:
• No advance deposit required — pay comfortably upon check-in (Cash / Card / QR).
• Check-in starts at 12:00 PM (Noon). Free 24/7 luggage storage if you arrive early.
• Location: 26 Thamel Bhagwati Marg, Kathmandu (central Thamel, quiet alley).
• Front Desk Phone: +977-1-4530311 / +977-9818259472

We look forward to welcoming you with authentic Himalayan Sherpa hospitality! 🏔️`;

      const waRes = await sendWhatsAppMessage({
        to: formattedTo,
        text: confirmationText,
        buttons: ['Hotel Location', 'Front Desk Call'],
      });

      whatsappSent = waRes.success;
      if (!waRes.success) whatsappError = waRes.error;
    }

    return NextResponse.json({
      success: true,
      bookingCode,
      reservation,
      whatsappSent,
      whatsappError,
      message: `Reservation ${bookingCode} created and confirmed successfully!`,
    });
  } catch (error: any) {
    console.error('Approve booking error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve booking.' },
      { status: 500 }
    );
  }
}
