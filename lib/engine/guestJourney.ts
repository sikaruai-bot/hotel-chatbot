import { prisma } from '../prisma';
import { detectIntent } from './intentDetector';
import { EmailDraftResponse, ParsedEmailMessage } from '../email/types';
import { isMultilingualEnabled } from './featureFlags';
import { getMessageLanguage } from './language';

/**
 * Standard Front Desk Contact & Human Contact Footer
 * Enforces Safety Rule 9: Every automated message must include a clear "Talk to Staff" / human-contact option.
 */
export const STAFF_CONTACT_FOOTER_TEXT = `
────────────────────────────────────────────────────────
💬 Need assistance or prefer speaking with our team?
• Phone / WhatsApp: +977 9818259472 (24/7 Front Desk)
• Email: info@hotelsherpasoul.com
• Address: Chaksibari Marg, Thamel, Kathmandu 44600, Nepal
• Location: Centrally located in quiet Thamel (near Garden of Dreams)
────────────────────────────────────────────────────────`;

export const STAFF_CONTACT_FOOTER_HTML = `
<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #4a5568;">
  <p style="margin: 0 0 8px 0; font-weight: 600; color: #2d3748;">💬 Need assistance or prefer speaking with our team?</p>
  <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
    <li><strong>WhatsApp / Phone:</strong> <a href="https://wa.me/9779818259472" style="color: #3182ce;">+977 9818259472</a> (24/7 Front Desk)</li>
    <li><strong>Email:</strong> <a href="mailto:info@hotelsherpasoul.com" style="color: #3182ce;">info@hotelsherpasoul.com</a></li>
    <li><strong>Address:</strong> Chaksibari Marg, Thamel, Kathmandu 44600, Nepal</li>
  </ul>
</div>`;

/**
 * Generates an email response draft grounded strictly in the hotel knowledge base.
 * Enforces Safety Rule 6 (no hallucination), Rule 7 (reservation status check),
 * Rule 9 ("Talk to Staff" contact), and Rule 10 (default auto-reply = OFF, draft for human review).
 */
export async function generateEmailReplyDraft(
  email: ParsedEmailMessage,
  customerId?: string
): Promise<EmailDraftResponse> {
  const rawEmailContent = `${email.subject} ${email.textBody}`;
  const intentResult = detectIntent(rawEmailContent);
  const detectedLang = isMultilingualEnabled()
    ? await getMessageLanguage(rawEmailContent)
    : intentResult.language || 'en';
  const lang = detectedLang || 'en';
  const guestName = email.fromName && email.fromName !== 'Guest' ? email.fromName : 'Valued Guest';

  const groundedKnowledge: string[] = [];
  let bodyContentText = '';
  let bodyContentHtml = '';

  switch (intentResult.intent) {
    case 'ROOM_PRICE':
    case 'ROOM_AVAILABILITY':
    case 'BOOKING':
    case 'BOOKING_INQUIRY': {
      groundedKnowledge.push('Room rates: Deluxe ($20/night), Family ($30/night), Budget Family ($25/night)');
      groundedKnowledge.push('Flexible check-in from 12:00 PM, check-out 11:00 AM');
      groundedKnowledge.push('Direct booking discount: 10% instant direct saving');

      if (lang === 'fr' && isMultilingualEnabled()) {
        bodyContentText = `Merci d'avoir contacté l'Hôtel Sherpa Soul concernant nos disponibilités et tarifs à Thamel, Katmandou.

Voici nos options officielles de chambres et tarifs directs :
• Chambre Double Deluxe : USD $20 / nuit (Salle de bain privée, balcon, vue montagne/ville)
• Chambre Familiale Budget : USD $25 / nuit (Espace confortable pour familles ou petits groupes)
• Suite Familiale : USD $30 / nuit (Aménagement spacieux avec plusieurs lits)

Avantages exclusifs en réservation directe :
• 10% de remise immédiate pour réservation directe
• Enregistrement (Check-in) : flexible dès 12h00 (selon disponibilité)
• Arrivée anticipée : bagagerie gratuite à la réception
• Départ (Check-out) : 11h00 (départ tardif sur demande)
• Wi-Fi haut débit et eau chaude 24h/24 inclus
• Terrasse panoramique paisible sur le toit donnant sur la vallée

Statut : DEMANDE DE RÉSERVATION REÇUE (En attente d'attribution par la réception)
Veuillez nous indiquer vos dates de séjour et le nombre de voyageurs afin que notre équipe puisse préparer votre chambre.`;

        bodyContentHtml = `
<p>Cher/Chère ${escapeHtml(guestName)},</p>
<p>Merci d'avoir contacté l'<strong>Hôtel Sherpa Soul</strong> concernant nos disponibilités et tarifs à Thamel, Katmandou.</p>
<p>Voici nos options officielles de chambres et tarifs directs :</p>
<ul>
  <li><strong>Chambre Double Deluxe :</strong> USD $20 / nuit (Salle de bain privée, balcon, vue montagne/ville)</li>
  <li><strong>Chambre Familiale Budget :</strong> USD $25 / nuit (Espace confortable pour familles ou petits groupes)</li>
  <li><strong>Suite Familiale :</strong> USD $30 / nuit (Aménagement spacieux avec plusieurs lits)</li>
</ul>
<p><strong>Avantages exclusifs en réservation directe :</strong></p>
<ul>
  <li>10% de réduction immédiate pour réservation directe</li>
  <li>Enregistrement flexible dès 12h00 (selon disponibilité)</li>
  <li>Consigne à bagages gratuite à l'arrivée</li>
  <li>Départ à 11h00 (départ tardif sur demande)</li>
  <li>Wi-Fi haut débit et eau chaude solaire/électrique 24h/24</li>
  <li>Terrasse panoramique sur le toit donnant sur la vallée de Katmandou</li>
</ul>
<p style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 10px 14px; font-weight: 500;">
  <strong>Statut :</strong> DEMANDE DE RÉSERVATION REÇUE (En attente d'attribution par la réception)<br>
  Veuillez nous indiquer vos dates de voyage et le nombre de voyageurs afin que notre équipe puisse réserver votre chambre.
</p>`;
      } else {
        bodyContentText = `Thank you for contacting Hotel Sherpa Soul regarding room availability and rates in Thamel, Kathmandu.

Here are our official room options and direct rates:
• Deluxe Double Room: USD $20 / night (Private bathroom, balcony, mountain/city view)
• Budget Family Room: USD $25 / night (Cozy space for families or small groups)
• Family Suite: USD $30 / night (Spacious layout with multiple beds)

Special Direct Perks:
• Instant 10% direct booking discount
• Check-in: Flexible from 12:00 PM, subject to room availability.
• Early arrival: Free luggage storage; early check-in subject to availability.
• Check-out: 11:00 AM; late check-out on request, subject to availability.
• High-speed Wi-Fi & 24/7 hot water included
• Peaceful rooftop terrace with views over Swayambhunath and the valley

Status: BOOKING INQUIRY RECEIVED (Pending Front Desk Room Allocation)
Please let us know your planned arrival and departure dates, along with the number of guests. Our front desk manager will gladly allocate your room and finalize your stay.`;

        bodyContentHtml = `
<p>Dear ${escapeHtml(guestName)},</p>
<p>Thank you for contacting <strong>Hotel Sherpa Soul</strong> regarding room availability and rates in Thamel, Kathmandu.</p>
<p>Here are our official room options and direct rates:</p>
<ul>
  <li><strong>Deluxe Double Room:</strong> USD $20 / night (Private attached bathroom, balcony, mountain/city view)</li>
  <li><strong>Budget Family Room:</strong> USD $25 / night (Cozy space for families or small groups)</li>
  <li><strong>Family Suite:</strong> USD $30 / night (Spacious layout with multiple beds)</li>
</ul>
<p><strong>Direct Booking Perks:</strong></p>
<ul>
  <li>Instant 10% direct booking discount</li>
  <li>Flexible check-in from 12:00 PM (subject to availability)</li>
  <li>Complimentary luggage storage for early arrivals</li>
  <li>Standard check-out at 11:00 AM (late check-out upon request)</li>
  <li>Free high-speed Wi-Fi and 24/7 solar/electric hot water</li>
  <li>Peaceful rooftop terrace overlooking the Kathmandu valley</li>
</ul>
<p style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 10px 14px; font-weight: 500;">
  <strong>Status:</strong> BOOKING INQUIRY RECEIVED (Pending Front Desk Room Allocation)<br>
  Please let us know your travel dates and guest count so our team can hold your preferred room.
</p>`;
      }
      break;
    }

    case 'CHECK_IN':
    case 'CHECK_OUT':
    case 'POLICY': {
      groundedKnowledge.push('Flexible check-in from 12:00 PM, subject to room availability');
      groundedKnowledge.push('Early arrival: free luggage storage; early check-in subject to availability');
      groundedKnowledge.push('Check-out: 11:00 AM; late check-out on request, subject to availability');

      bodyContentText = `Thank you for asking about our check-in and check-out policies at Hotel Sherpa Soul.

Our Official Policies:
• Check-in: Flexible from 12:00 PM, subject to room availability.
• Early arrival: Free luggage storage at front desk; early check-in is accommodated free of charge when your room is ready.
• Check-out: 11:00 AM; late check-out is available on request, subject to room availability.
• Payment: Cash (NPR/USD), Credit/Debit Card, or local QR payment upon arrival. No advance deposit required for direct travelers.`;

      bodyContentHtml = `
<p>Dear ${escapeHtml(guestName)},</p>
<p>Thank you for asking about our check-in and check-out policies at <strong>Hotel Sherpa Soul</strong>.</p>
<ul>
  <li><strong>Check-in:</strong> Flexible from 12:00 PM, subject to room availability.</li>
  <li><strong>Early arrival:</strong> Free secure luggage storage at our front desk; early room access provided whenever available.</li>
  <li><strong>Check-out:</strong> 11:00 AM; late check-out is available on request, subject to room availability.</li>
  <li><strong>Payment:</strong> Cash, Cards, and QR payments accepted upon arrival. No advance deposit needed.</li>
</ul>`;
      break;
    }

    case 'SHARED_KITCHEN': {
      groundedKnowledge.push('Room 102 is a fully equipped shared kitchen available exclusively for long-term guests (2+ weeks)');

      bodyContentText = `Thank you for inquiring about our kitchen facilities at Hotel Sherpa Soul.

• Room 102 is our dedicated, fully equipped shared kitchen (gas stove, cookware, refrigerator).
• Availability: It is reserved exclusively for long-term guests staying 2 weeks (14 days) or longer.
• For daily guests, Thamel offers hundreds of delicious bakeries, cafes, and authentic Nepali eateries within a 1 to 3-minute walk.`;

      bodyContentHtml = `
<p>Dear ${escapeHtml(guestName)},</p>
<p>Thank you for inquiring about kitchen facilities at <strong>Hotel Sherpa Soul</strong>.</p>
<ul>
  <li><strong>Room 102 Shared Kitchen:</strong> Fully equipped with gas stove, refrigerator, and cooking utensils.</li>
  <li><strong>Policy:</strong> Available exclusively for guests booking long stays of 2 weeks (14 days) or longer.</li>
  <li>For short-stay guests, Thamel’s finest cafes, breakfast bakeries, and Nepali restaurants are right outside our doorstep.</li>
</ul>`;
      break;
    }

    case 'LOCATION': {
      groundedKnowledge.push('Chaksibari Marg, Thamel, Kathmandu');
      groundedKnowledge.push('Walking distance: Garden of Dreams (5 min), Kathmandu Durbar Square (20 min)');
      groundedKnowledge.push('Half-day hikes: Tarebhir, Shivapuri Nagi Gompa, Jamacho');

      bodyContentText = `Thank you for asking about Hotel Sherpa Soul's location and nearby attractions.

We are located at Chaksibari Marg, Thamel — nestled in a peaceful side street just steps away from vibrant shops, trekking agencies, and cafes.

Nearby Walking Attractions:
• Garden of Dreams (5-minute stroll)
• Thamel Heritage Walk & local markets
• Kathmandu Durbar Square (20–25 minutes walk)
• Ason Traditional Bazaar & Swayambhunath (Monkey Temple)

Half-Day Hikes & Culture:
• Tarebhir Hike, Nagi Gompa (Shivapuri National Park), Jamacho Gompa
• Narayanhiti Palace Museum, Museum of Nepali Art, and local historic temples`;

      bodyContentHtml = `
<p>Dear ${escapeHtml(guestName)},</p>
<p>Thank you for inquiring about our location and Kathmandu city guide.</p>
<p>Hotel Sherpa Soul is located on <strong>Chaksibari Marg, Thamel</strong> — quiet, safe, and just steps from the best of Kathmandu.</p>
<p><strong>Highlights Nearby:</strong></p>
<ul>
  <li><strong>Walking in Thamel:</strong> Garden of Dreams (5 min), Thamel Heritage Walk, local cafes and trekking gear shops.</li>
  <li><strong>Walking (20–40 min):</strong> Kathmandu Durbar Square, Ason Bazaar, Swayambhunath (Monkey Temple).</li>
  <li><strong>Hikes & Culture:</strong> Tarebhir, Nagi Gompa (Shivapuri), Narayanhiti Palace Museum, Museum of Nepali Art.</li>
</ul>`;
      break;
    }

    case 'COMPLAINT': {
      groundedKnowledge.push('Immediate human escalation for guest complaints');

      bodyContentText = `Dear ${guestName},

We sincerely apologize for the inconvenience you experienced. Your feedback is extremely important to us, and our General Manager and Front Desk team have been immediately notified.

A senior team member will review your message and contact you directly within a few hours to resolve this.

If you are currently at the hotel, please visit our front desk or call our direct manager line at +977 9818259472 for immediate assistance.`;

      bodyContentHtml = `
<p>Dear ${escapeHtml(guestName)},</p>
<p>We sincerely apologize for the inconvenience you experienced. Your comfort is our highest priority, and your message has been escalated directly to our management team.</p>
<p>A senior staff member is reviewing your inquiry and will reach out to you directly to ensure this is resolved.</p>
<p>For immediate assistance at any time, please call our 24/7 Front Desk manager directly at <a href="tel:+9779818259472">+977 9818259472</a>.</p>`;
      break;
    }

    default: {
      groundedKnowledge.push('General hotel hospitality inquiry handled with front desk contact');

      bodyContentText = `Thank you for contacting Hotel Sherpa Soul in Thamel, Kathmandu.

We have received your message regarding: "${email.subject}".
Our front desk team is reviewing your message and will provide you with all requested details shortly.`;

      bodyContentHtml = `
<p>Dear ${escapeHtml(guestName)},</p>
<p>Thank you for writing to <strong>Hotel Sherpa Soul</strong> in Thamel, Kathmandu.</p>
<p>We have received your message regarding: <em>${escapeHtml(email.subject)}</em>.</p>
<p>Our front desk team is reviewing your note and will be pleased to assist you with all requested information.</p>`;
      break;
    }
  }

  const fullText = `${bodyContentText}\n${STAFF_CONTACT_FOOTER_TEXT}`;
  const fullHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; max-width: 600px;">
  ${bodyContentHtml}
  ${STAFF_CONTACT_FOOTER_HTML}
</div>`;

  let draftSubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
  if (isMultilingualEnabled() && lang !== 'en') {
    const langTag = `[${lang.toUpperCase()}]`;
    if (!draftSubject.includes(langTag)) {
      draftSubject = `${langTag} ${draftSubject}`;
    }
  }

  return {
    to: email.fromEmail,
    subject: draftSubject,
    text: fullText,
    html: fullHtml,
    isDraftOnly: true, // Safety Rule 10: Default email auto-reply = OFF; human-in-the-loop first
    requiresStaffApproval: true,
    groundedKnowledge,
    humanContactIncluded: true, // Safety Rule 9: Human contact included
  };
}

/**
 * Gatekeeper for post-stay review requests.
 * Enforces Safety Rule 8: "Never send review request after negative feedback or complaint."
 */
export async function canSendReviewRequest(customerId: string): Promise<{
  allowed: boolean;
  reason: string;
  hasComplaint?: boolean;
}> {
  // 1. Check customer's reservations
  const reservations = await prisma.reservation.findMany({
    where: { customerId },
    orderBy: { checkOutDate: 'desc' },
  });

  if (reservations.length === 0) {
    return {
      allowed: false,
      reason: 'No completed reservation found for this customer.',
    };
  }

  // Must have completed stay (CHECKED_OUT)
  const completedStay = reservations.some((r) => r.status === 'CHECKED_OUT');
  if (!completedStay) {
    return {
      allowed: false,
      reason: 'Guest has not completed their stay (CHECKED_OUT status required).',
    };
  }

  // 2. Check for any COMPLAINT intent or negative sentiment across all customer conversations
  const conversations = await prisma.conversation.findMany({
    where: { customerId },
    include: {
      messages: {
        where: { direction: 'INBOUND' },
      },
    },
  });

  const negativeKeywords = [
    'complaint', 'dirty', 'cold water', 'rude', 'bad service', 'unhappy',
    'noisy', 'refund', 'terrible', 'worst', 'broken', 'disappointed', 'angry'
  ];

  for (const conv of conversations) {
    for (const msg of conv.messages) {
      const lower = msg.content.toLowerCase();
      for (const kw of negativeKeywords) {
        if (lower.includes(kw)) {
          return {
            allowed: false,
            reason: `Review request suppressed: Negative sentiment keyword "${kw}" detected in message history.`,
            hasComplaint: true,
          };
        }
      }
    }
  }

  return {
    allowed: true,
    reason: 'Guest completed stay with zero recorded complaints or negative sentiment.',
  };
}

/**
 * Strict Reservation Status Notification Builder.
 * Enforces Safety Rule 7: "Never say 'confirmed booking' unless PMS reservation status is CONFIRMED."
 */
export async function buildReservationNotification(reservationId: string): Promise<{
  allowedToClaimConfirmed: boolean;
  messageText: string;
  status: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error(`Reservation not found for id: ${reservationId}`);
  }

  if (reservation.status === 'CONFIRMED') {
    return {
      allowedToClaimConfirmed: true,
      status: reservation.status,
      messageText: `Dear ${reservation.guestName}, your booking (${reservation.bookingCode}) is CONFIRMED at Hotel Sherpa Soul! Check-in: flexible from 12:00 PM. We look forward to welcoming you in Thamel.${STAFF_CONTACT_FOOTER_TEXT}`,
    };
  }

  // For all other statuses (e.g. PENDING_REQUEST)
  return {
    allowedToClaimConfirmed: false,
    status: reservation.status,
    messageText: `Dear ${reservation.guestName}, we have received your booking inquiry (${reservation.bookingCode}). Status: PENDING FRONT DESK APPROVAL & ROOM ALLOCATION. We will contact you once approved.${STAFF_CONTACT_FOOTER_TEXT}`,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
