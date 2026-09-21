/**
 * Hotel Sherpa Soul PMS Integration Client
 * Connects the Chatbot directly with Hotel Sherpa Soul PMS
 * Base URL: https://pms.hotelsherpasoul.com
 */

const PMS_BASE_URL = process.env.PMS_BASE_URL || 'https://pms.hotelsherpasoul.com';
const PMS_API_KEY = process.env.PMS_API_KEY || 'sherpa-bot-key-2026';

export interface PmsAvailabilityParams {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
}

export interface PmsCategorySummary {
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  bedType: string;
  dailyRateNpr: number;
  dailyRateUsd: number;
  totalPriceNpr: number;
  totalPriceUsd: number;
  availableCount: number;
  availableRoomNumbers: string[];
}

export interface PmsAvailabilityResponse {
  success: boolean;
  data?: {
    hotel: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    requestedGuests: { adults: number; children: number; totalGuests: number };
    isAnyAvailable: boolean;
    totalAvailableRoomsCount: number;
    categories: PmsCategorySummary[];
    rooms: Array<{
      roomId: string;
      roomNumber: string;
      floor: number;
      roomType: string;
      capacity: number;
      bedType: string;
      dailyRateNpr: number;
      dailyRateUsd: number;
      totalNights: number;
      totalPriceNpr: number;
      totalPriceUsd: number;
    }>;
  };
  error?: string;
}

export interface PmsBookingPayload {
  guestName: string;
  phone?: string | null;
  email?: string | null;
  channel: 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'WEBSITE' | string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  roomTypeName?: string | null;
  roomNumber?: string | null;
  adults?: number;
  children?: number;
  totalAmount?: number;
  paidAmount?: number;
  paymentStatus?: 'UNPAID' | 'PAID' | 'PARTIAL';
  specialRequests?: string | null;
  externalMessageId?: string | null;
  threadId?: string | null;
}

export interface PmsBookingResponse {
  success: boolean;
  message?: string;
  isDuplicate?: boolean;
  data?: {
    id: string;
    reservationNumber: string;
    guestName: string;
    phone: string;
    email: string;
    roomNumber: string;
    roomType: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    adults: number;
    children: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    currency: string;
    status: string;
    paymentStatus: string;
    channel: string;
    voucherUrl: string;
    supportContact: {
      hotel: string;
      phone: string;
      landline: string;
      location: string;
    };
  };
  error?: string;
}

/**
 * Check real-time room availability and pricing in PMS
 */
export async function checkPmsAvailability(
  params: PmsAvailabilityParams
): Promise<PmsAvailabilityResponse> {
  try {
    const url = new URL(`${PMS_BASE_URL}/api/bot/availability`);
    url.searchParams.set('checkIn', params.checkIn);
    url.searchParams.set('checkOut', params.checkOut);
    if (params.adults) url.searchParams.set('adults', String(params.adults));
    if (params.children !== undefined) url.searchParams.set('children', String(params.children));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': PMS_API_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    return await res.json();
  } catch (error: any) {
    console.error('[PMS Client] Availability check error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create confirmed reservation directly in PMS
 */
export async function createPmsBooking(
  payload: PmsBookingPayload
): Promise<PmsBookingResponse> {
  try {
    const res = await fetch(`${PMS_BASE_URL}/api/bot/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PMS_API_KEY,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (error: any) {
    console.error('[PMS Client] Booking creation error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Lookup reservation by PMS Reservation Number (HSS-...) or Guest Phone Number
 */
export async function lookupPmsBooking(identifier: string): Promise<any> {
  try {
    const res = await fetch(
      `${PMS_BASE_URL}/api/bot/booking/${encodeURIComponent(identifier.trim())}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': PMS_API_KEY,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    return await res.json();
  } catch (error: any) {
    console.error('[PMS Client] Booking lookup error:', error.message);
    return { success: false, error: error.message };
  }
}
