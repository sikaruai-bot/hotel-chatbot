import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. Sliding window rate-limiter: Max 8 requests per 10 minutes per IP/Phone
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 8;

  const record = rateLimitMap.get(identifier);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

// 2. Input sanitization helper (prevent XSS, control characters, script injection)
function sanitizeString(str?: string | null, maxLen: number = 200): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>'"&;`]/g, '') // strip dangerous HTML/script characters
    .trim()
    .slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  try {
    // Determine client IP for abuse detection
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';

    if (isRateLimited(`ip:${clientIp}`)) {
      return NextResponse.json(
        { error: 'Too many booking requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      checkIn,
      checkOut,
      roomType = 'Deluxe Room',
      adults = 1,
      children = 0,
      roomsRequested = 1,
      guestName,
      phone,
      email,
      specialRequests,
    } = body;

    // Sanitize and validate inputs
    const cleanGuestName = sanitizeString(guestName, 80);
    const cleanPhone = sanitizeString(phone, 30);
    const cleanEmail = email ? sanitizeString(email, 100).toLowerCase() : null;
    const cleanSpecialRequests = sanitizeString(specialRequests, 400);
    const cleanRoomType = sanitizeString(roomType, 50) || 'Deluxe Room';

    if (!cleanGuestName || cleanGuestName.length < 2) {
      return NextResponse.json(
        { error: 'Please enter a valid guest name (at least 2 characters).' },
        { status: 400 }
      );
    }

    // Phone validation (digits, +, -, space only, min 7 chars)
    const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || phoneDigits.length < 7 || phoneDigits.length > 15) {
      return NextResponse.json(
        { error: 'Please enter a valid mobile or WhatsApp phone number.' },
        { status: 400 }
      );
    }

    // Rate-limit by phone number as well
    if (isRateLimited(`phone:${phoneDigits}`)) {
      return NextResponse.json(
        { error: 'Too many requests for this phone number. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Email format validation if provided
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Date validation
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Check-in and check-out dates are required.' },
        { status: 400 }
      );
    }

    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dates provided. Please select valid calendar dates.' },
        { status: 400 }
      );
    }

    // Check-in cannot be in the past (allowing 24h grace period for timezone differences)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    if (d1 < yesterday) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past.' },
        { status: 400 }
      );
    }

    // Check-out must be after check-in
    if (d2 <= d1) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date.' },
        { status: 400 }
      );
    }

    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights > 90) {
      return NextResponse.json(
        { error: 'Online reservations are limited to 90 nights maximum. For longer stays, please contact front desk directly.' },
        { status: 400 }
      );
    }

    // Validate Guest Counts
    const safeAdults = Math.max(1, Math.min(Number(adults) || 1, 8));
    const safeChildren = Math.max(0, Math.min(Number(children) || 0, 6));
    const safeRooms = Math.max(1, Math.min(Number(roomsRequested) || 1, 3));

    // 3. Find or create Customer record
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { whatsappId: cleanPhone }],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: cleanGuestName,
          phone: cleanPhone,
          email: cleanEmail,
          firstChannel: 'WEBSITE',
          notes: cleanSpecialRequests ? `Special request: ${cleanSpecialRequests}` : null,
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: cleanGuestName,
          ...(cleanEmail ? { email: cleanEmail } : {}),
        },
      });
    }

    // 4. Calculate Rate & Direct Discount
    let baseRate = 20;
    const lowerRoom = cleanRoomType.toLowerCase();
    if (lowerRoom.includes('family') && !lowerRoom.includes('budget')) {
      baseRate = 30;
    }

    const rawTotal = baseRate * nights * safeRooms;
    const discountedTotal = Math.round(rawTotal * 0.9);
    const inquiryCode = `INQ-${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Create Lead in CRM
    const lead = await prisma.lead.create({
      data: {
        customerId: customer.id,
        name: cleanGuestName,
        phone: cleanPhone,
        email: cleanEmail,
        channel: 'WEBSITE',
        source: 'Website Direct Booking Engine',
        checkIn: d1.toISOString().split('T')[0],
        checkOut: d2.toISOString().split('T')[0],
        adults: safeAdults,
        children: safeChildren,
        roomType: cleanRoomType,
        roomsRequested: safeRooms,
        estimatedValue: discountedTotal,
        leadStatus: 'BOOKING_REQUEST',
        conversationStatus: 'BOOKING_REQUEST',
        scoreReason: `HIGH INTENT — Website Direct Booking Inquiry (${inquiryCode}) for ${cleanRoomType} (${nights} night(s))`,
        notes: cleanSpecialRequests ? `Inquiry #${inquiryCode}: ${cleanSpecialRequests}` : `Inquiry #${inquiryCode}`,
      },
    });

    // 6. Create or update staff Conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        customerId: customer.id,
        channel: 'WEBSITE',
        status: { not: 'CLOSED' },
      },
    });

    const summaryText = `Direct Booking Request (${inquiryCode}): ${cleanRoomType} (${d1.toISOString().split('T')[0]} to ${d2.toISOString().split('T')[0]}, ${safeAdults} adults)`;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          channel: 'WEBSITE',
          status: 'BOOKING_REQUEST',
          mode: 'BOT',
          unreadStaff: true,
          summary: summaryText,
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'BOOKING_REQUEST',
          unreadStaff: true,
          summary: summaryText,
        },
      });
    }

    // Inbound message for staff visibility
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        customerId: customer.id,
        channel: 'WEBSITE',
        direction: 'INBOUND',
        messageType: 'TEXT',
        content: `🛎️ [Website Booking Request #${inquiryCode}]\nRoom: ${cleanRoomType}\nDates: ${d1.toISOString().split('T')[0]} to ${d2.toISOString().split('T')[0]} (${nights} night(s))\nGuests: ${safeAdults} adult(s)${safeChildren ? `, ${safeChildren} child` : ''}\nEstimated Total: $${discountedTotal} (10% Direct Discount applied)\nSpecial Requests: ${cleanSpecialRequests || 'None'}`,
      },
    });

    return NextResponse.json({
      success: true,
      inquiryCode,
      leadId: lead.id,
      nights,
      baseRate,
      estimatedTotal: discountedTotal,
      message: 'Booking inquiry received. Front desk will review and confirm shortly.',
    });
  } catch (error: any) {
    console.error('Booking inquiry security error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again or contact our front desk.' },
      { status: 500 }
    );
  }
}
