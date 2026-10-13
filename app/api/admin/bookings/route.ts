import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/meta/whatsapp';
import { checkPmsAvailability, createPmsBooking, lookupPmsBooking } from '@/lib/pmsClient';
import { validateAdminRequest } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Defense-in-depth: Verify admin authorization
  const auth = validateAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

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
    console.error('Fetch reservations error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Defense-in-depth: Verify admin authorization
  const auth = validateAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  let leadId: string | undefined;
  let leaseAcquired = false;
  let lead: any = null;

  try {
    const body = await req.json();
    leadId = body.leadId;
    const {
      customerId: inputCustomerId,
      guestName,
      guestPhone,
      guestEmail,
      roomTypeId: inputRoomTypeId,
      roomTypeCode,
      roomId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      totalPriceUsd = 20,
      sendWhatsAppNotification = true,
      notes,
    } = body;

    // Load lead if leadId is supplied
    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { customer: true },
      });

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // Handle Retries and Duplicate Approvals Safely (Idempotency)
      if (lead.leadStatus === 'CONFIRMED') {
        const existingRes = await prisma.reservation.findFirst({
          where: {
            customerId: lead.customerId,
            status: 'CONFIRMED',
          },
          orderBy: { createdAt: 'desc' },
          include: { room: true, roomType: true, customer: true },
        });

        if (existingRes) {
          return NextResponse.json({
            success: true,
            bookingCode: existingRes.bookingCode,
            pmsBookingReference: existingRes.bookingCode,
            reservation: existingRes,
            alreadyApproved: true,
            idempotent: true,
            message: `Lead was already confirmed with reservation ${existingRes.bookingCode}.`,
          });
        }
      }

      // Check if lead is ALREADY PROCESSING (concurrency conflict)
      if (lead.leadStatus === 'PROCESSING') {
        return NextResponse.json(
          {
            error: 'Booking approval is currently in progress for this lead. Please wait a moment.',
            inProgress: true,
          },
          { status: 409 }
        );
      }
    }

    const effectiveGuestName = (guestName || lead?.name || lead?.customer?.name || '').trim();
    const effectiveCheckIn = checkInDate || lead?.checkIn;
    const effectiveCheckOut = checkOutDate || lead?.checkOut;
    const effectivePhone = guestPhone || lead?.phone || lead?.customer?.phone;
    const effectiveEmail = guestEmail || lead?.email || lead?.customer?.email;
    const effectiveAdults = adults !== undefined ? adults : (lead?.adults || 1);
    const effectiveChildren = children !== undefined ? children : (lead?.children || 0);
    const effectiveRoomTypeCode = roomTypeCode || lead?.roomType;

    // 1. Validate Guest Data & Dates on the Server
    if (!effectiveGuestName || typeof effectiveGuestName !== 'string' || effectiveGuestName.length < 2) {
      return NextResponse.json(
        { error: 'Valid guest name (at least 2 characters) is required.' },
        { status: 400 }
      );
    }

    if (!effectiveCheckIn || !effectiveCheckOut) {
      return NextResponse.json(
        { error: 'Check-in date and check-out date are required.' },
        { status: 400 }
      );
    }

    const cIn = new Date(effectiveCheckIn);
    const cOut = new Date(effectiveCheckOut);

    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dates provided. Please supply valid ISO dates.' },
        { status: 400 }
      );
    }

    if (cOut <= cIn) {
      return NextResponse.json(
        { error: 'Check-out date must be strictly after check-in date.' },
        { status: 400 }
      );
    }

    const cleanCheckInStr = cIn.toISOString().split('T')[0];
    const cleanCheckOutStr = cOut.toISOString().split('T')[0];

    // Must have at least one valid contact method (phone or email)
    const cleanPhone = effectivePhone ? String(effectivePhone).trim() : null;
    const cleanEmail = effectiveEmail ? String(effectiveEmail).trim() : null;

    if (!cleanPhone && !cleanEmail) {
      return NextResponse.json(
        { error: 'At least one verified contact method (phone or email) is required to approve a reservation.' },
        { status: 400 }
      );
    }

    // 3. Resolve Customer
    let customerId = inputCustomerId || lead?.customerId;
    if (!customerId && cleanPhone) {
      const existing = await prisma.customer.findFirst({
        where: { OR: [{ phone: cleanPhone }, { whatsappId: cleanPhone }] },
      });
      if (existing) customerId = existing.id;
    }

    if (!customerId) {
      const newCust = await prisma.customer.create({
        data: {
          name: effectiveGuestName,
          phone: cleanPhone,
          email: cleanEmail,
          firstChannel: 'ADMIN_APPROVAL',
        },
      });
      customerId = newCust.id;
    }

    // 4. Resolve Room Type
    let matchedRoomType = null;
    if (inputRoomTypeId) {
      matchedRoomType = await prisma.roomType.findUnique({
        where: { id: inputRoomTypeId },
      });
    }

    if (!matchedRoomType) {
      const code = effectiveRoomTypeCode || 'DELUXE';
      matchedRoomType = await prisma.roomType.findFirst({
        where: {
          OR: [{ code }, { name: { contains: code } }],
        },
      });
    }

    if (!matchedRoomType) {
      matchedRoomType = await prisma.roomType.findFirst({ where: { code: 'DELUXE' } });
    }

    if (!matchedRoomType) {
      return NextResponse.json({ error: 'Room type not found in database.' }, { status: 400 });
    }

    // 5. Resolve Assigned Room
    let assignedRoom = null;
    if (roomId) {
      assignedRoom = await prisma.room.findUnique({ where: { id: roomId } });
    }

    // 6. Concurrency Lease Acquisition (Prevent simultaneous approvals)
    if (leadId) {
      const leaseResult = await prisma.lead.updateMany({
        where: {
          id: leadId,
          leadStatus: { notIn: ['CONFIRMED', 'PROCESSING'] },
        },
        data: {
          leadStatus: 'PROCESSING',
        },
      });

      if (leaseResult.count === 0) {
        // Concurrency conflict: another staff request acquired lease or already confirmed
        const currentLead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (currentLead?.leadStatus === 'CONFIRMED') {
          const existingRes = await prisma.reservation.findFirst({
            where: { customerId: currentLead.customerId, status: 'CONFIRMED' },
            orderBy: { createdAt: 'desc' },
            include: { room: true, roomType: true, customer: true },
          });
          return NextResponse.json({
            success: true,
            bookingCode: existingRes?.bookingCode,
            pmsBookingReference: existingRes?.bookingCode,
            reservation: existingRes,
            alreadyApproved: true,
            idempotent: true,
            message: `Lead was already confirmed with reservation ${existingRes?.bookingCode || 'recorded'}.`,
          });
        }

        return NextResponse.json(
          {
            error: 'Concurrent booking approval conflict: this lead is currently being processed by another staff request.',
            inProgress: true,
          },
          { status: 409 }
        );
      }

      leaseAcquired = true;
    }

    // 7. Check Availability in PMS
    const safeAdults = Math.max(1, Number(effectiveAdults) || 1);
    const safeChildren = Math.max(0, Number(effectiveChildren) || 0);

    const pmsAvail = await checkPmsAvailability({
      checkIn: cleanCheckInStr,
      checkOut: cleanCheckOutStr,
      adults: safeAdults,
      children: safeChildren,
    });

    if (pmsAvail.success && pmsAvail.data && !pmsAvail.data.isAnyAvailable) {
      if (leadId && leaseAcquired) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { leadStatus: 'BOOKING_REQUEST' },
        });
        leaseAcquired = false;
      }
      return NextResponse.json(
        { error: `PMS reports zero available rooms for ${cleanCheckInStr} to ${cleanCheckOutStr}.` },
        { status: 400 }
      );
    }

    // 8. PMS Booking Payload with Idempotency Key
    const pmsBookingPayload = {
      guestName: effectiveGuestName,
      phone: cleanPhone,
      email: cleanEmail,
      channel: 'STAFF_APPROVAL',
      checkInDate: cleanCheckInStr,
      checkOutDate: cleanCheckOutStr,
      roomTypeName: matchedRoomType.name,
      roomNumber: assignedRoom?.roomNumber || null,
      adults: safeAdults,
      children: safeChildren,
      specialRequests: notes || 'Approved by Hotel Sherpa Soul Front Desk',
      threadId: leadId || undefined,
      externalMessageId: leadId ? `LEAD-APPROVAL-${leadId}` : undefined,
    };

    // 9. Reconciliation Lookup before creating new booking:
    // If a previous attempt timed out after PMS creation, check if PMS already has this booking
    let pmsResult: any = null;

    if (cleanPhone) {
      try {
        const existingPms = await lookupPmsBooking(cleanPhone);
        if (existingPms?.success && existingPms.data) {
          const records = Array.isArray(existingPms.data) ? existingPms.data : [existingPms.data];
          const match = records.find(
            (b: any) =>
              b.reservationNumber &&
              (b.checkInDate === cleanCheckInStr || !b.checkInDate)
          );
          if (match) {
            pmsResult = {
              success: true,
              reconciled: true,
              data: match,
            };
          }
        }
      } catch (lookupErr: any) {
        console.warn('[Admin Booking Approval] Pre-check lookup skipped:', lookupErr?.message);
      }
    }

    if (!pmsResult) {
      pmsResult = await createPmsBooking(pmsBookingPayload);
    }

    // 10. Mark Confirmed ONLY when PMS returns verifiable success and booking reference
    if (!pmsResult?.success || !pmsResult.data?.reservationNumber) {
      const pmsErrorMsg = pmsResult?.error || 'PMS did not return a valid reservation number';
      console.error('[Admin Booking Approval] PMS creation failed:', pmsErrorMsg);

      // Revert lead to recoverable state (BOOKING_REQUEST) and record diagnostic notes
      if (leadId && leaseAcquired) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            leadStatus: 'BOOKING_REQUEST',
            notes: lead?.notes
              ? `${lead.notes} | [PMS Sync Failed ${new Date().toISOString()}]: ${pmsErrorMsg}`
              : `[PMS Sync Failed ${new Date().toISOString()}]: ${pmsErrorMsg}`,
          },
        });
        leaseAcquired = false;
      }

      return NextResponse.json(
        {
          success: false,
          error: `PMS reservation creation failed: ${pmsErrorMsg}. Lead reverted to BOOKING_REQUEST for safe retry.`,
          pmsSynced: false,
          recoverable: true,
        },
        { status: 502 }
      );
    }

    // PMS verified booking reference
    const officialBookingCode = pmsResult.data.reservationNumber;
    const finalRoomNumber = pmsResult.data.roomNumber || assignedRoom?.roomNumber || null;

    // 11. Persist Confirmed Reservation in Prisma Local DB
    const reservation = await prisma.reservation.create({
      data: {
        bookingCode: officialBookingCode,
        customerId,
        roomId: assignedRoom?.id || null,
        roomTypeId: matchedRoomType.id,
        guestName: effectiveGuestName,
        guestPhone: cleanPhone,
        guestEmail: cleanEmail,
        checkInDate: cIn,
        checkOutDate: cOut,
        adults: safeAdults,
        children: safeChildren,
        totalPriceUsd: Number(totalPriceUsd) || matchedRoomType.basePriceUsd,
        status: 'CONFIRMED',
        source: 'DIRECT_WEBSITE',
        notes: notes || (finalRoomNumber ? `Assigned Room: ${finalRoomNumber}` : 'Approved by Front Desk'),
      },
      include: {
        room: true,
        roomType: true,
        customer: true,
      },
    });

    // 12. Update Lead Status to CONFIRMED
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          leadStatus: 'CONFIRMED',
          conversationStatus: 'CONFIRMED',
          scoreReason: `CONFIRMED BOOKING — PMS Verified (Ref: ${officialBookingCode})`,
        },
      });
      leaseAcquired = false;
    }

    // 13. Update Customer record if missing details
    if (cleanPhone || cleanEmail) {
      try {
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            name: effectiveGuestName,
            ...(cleanPhone ? { phone: cleanPhone } : {}),
            ...(cleanEmail ? { email: cleanEmail } : {}),
          },
        });
      } catch {
        // Customer profile already exists or phone collision; safe to ignore
      }
    }

    // 14. Dispatch WhatsApp Confirmation (if requested and phone available)
    let whatsappSent = false;
    let whatsappError = undefined;

    if (sendWhatsAppNotification && cleanPhone) {
      const cleanPhoneDigits = cleanPhone.replace(/[^0-9]/g, '');
      const formattedTo = cleanPhoneDigits.startsWith('977')
        ? cleanPhoneDigits
        : cleanPhoneDigits.length === 10
        ? `977${cleanPhoneDigits}`
        : cleanPhoneDigits;

      const roomDisplay = finalRoomNumber
        ? `${matchedRoomType.name} (Room ${finalRoomNumber})`
        : matchedRoomType.name;

      const confirmationText = `🎉 Namaste ${guestName}!

Your reservation at Hotel Sherpa Soul is officially APPROVED and CONFIRMED in our PMS! 😊

━━━━━━━━━━━━━━━━━━
📌 Booking Ref: ${officialBookingCode}
🏨 Room: ${roomDisplay}
📅 Dates: ${cleanCheckInStr} to ${cleanCheckOutStr}
👥 Guests: ${safeAdults} adult(s)${safeChildren ? `, ${safeChildren} child` : ''}
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
      bookingCode: officialBookingCode,
      reservation,
      pmsSynced: true,
      whatsappSent,
      whatsappError,
      message: `Reservation ${officialBookingCode} verified by PMS and confirmed successfully!`,
    });
  } catch (error: any) {
    console.error('[Admin Booking Approval] Error:', error.message);

    // Rollback lead status to recoverable state if lease was held
    if (leadId && leaseAcquired) {
      try {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            leadStatus: 'BOOKING_REQUEST',
            notes: lead?.notes
              ? `${lead.notes} | [Approval Exception]: ${error.message}`
              : `[Approval Exception]: ${error.message}`,
          },
        });
      } catch (rollbackErr: any) {
        console.error('[Admin Booking Approval] Rollback failed:', rollbackErr.message);
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to approve booking.' },
      { status: 500 }
    );
  }
}
