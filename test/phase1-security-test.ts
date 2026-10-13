import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';
import {
  signAdminToken,
  verifyAdminToken,
  checkLoginRateLimit,
  recordFailedLogin,
  validateAdminRequest,
  getAdminSecretKey,
} from '../lib/auth/adminAuth';
import {
  createVisitorSessionToken,
  verifyVisitorSessionToken,
} from '../lib/auth/visitorSession';
import { verifyAdminTokenEdge } from '../lib/auth/edgeAuth';
import { maskPhoneNumber, maskSecret } from '../lib/masking';
import { GET as getLeads } from '../app/api/admin/leads/route';
import { GET as getRooms, POST as postRooms } from '../app/api/admin/rooms/route';
import { GET as getConversations } from '../app/api/admin/conversations/route';
import { GET as getAnalytics } from '../app/api/admin/analytics/route';
import { POST as postBooking } from '../app/api/admin/bookings/route';
import { POST as postLogin } from '../app/api/admin/auth/login/route';
import { POST as postWebsiteChat, GET as getWebsiteChat } from '../app/api/chat/website/route';
import { processInboundMessage } from '../lib/engine/chatDispatcher';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function runSecuritySuite() {
  console.log('\n======================================================');
  console.log('HOTEL SHERPA SOUL - PHASE 1 SECURITY & BOOKING SAFETY SUITE');
  console.log('======================================================\n');

  const adminSecret = process.env.ADMIN_SECRET_KEY || 'sherpa_soul_admin_secret_2026';
  const { token: validAdminToken } = signAdminToken('ADMIN');

  // =========================================================================
  // TEST GROUP 1: Unauthenticated Access & Sensitive Route Protection
  // =========================================================================
  console.log('[TEST GROUP 1: Unauthenticated Access to Admin APIs]');

  // 1.1 GET /api/admin/leads without credentials
  const reqLeadsUnauth = new NextRequest('http://localhost:3000/api/admin/leads', { method: 'GET' });
  const resLeadsUnauth = await getLeads(reqLeadsUnauth);
  assert(resLeadsUnauth.status === 401, 'GET /api/admin/leads without auth returns 401 Unauthorized');

  // 1.2 GET /api/admin/rooms without credentials
  const reqRoomsUnauth = new NextRequest('http://localhost:3000/api/admin/rooms', { method: 'GET' });
  const resRoomsUnauth = await getRooms(reqRoomsUnauth);
  assert(resRoomsUnauth.status === 401, 'GET /api/admin/rooms without auth returns 401 Unauthorized');

  // 1.3 GET /api/admin/conversations without credentials
  const reqConvsUnauth = new NextRequest('http://localhost:3000/api/admin/conversations', { method: 'GET' });
  const resConvsUnauth = await getConversations(reqConvsUnauth);
  assert(resConvsUnauth.status === 401, 'GET /api/admin/conversations without auth returns 401 Unauthorized');

  // 1.4 GET /api/admin/analytics without credentials
  const reqAnalyticsUnauth = new NextRequest('http://localhost:3000/api/admin/analytics', { method: 'GET' });
  const resAnalyticsUnauth = await getAnalytics(reqAnalyticsUnauth);
  assert(resAnalyticsUnauth.status === 401, 'GET /api/admin/analytics without auth returns 401 Unauthorized');

  // 1.5 POST /api/admin/bookings without credentials
  const reqBookingUnauth = new NextRequest('http://localhost:3000/api/admin/bookings', {
    method: 'POST',
    body: JSON.stringify({ leadId: 'lead_fake_123' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const resBookingUnauth = await postBooking(reqBookingUnauth);
  assert(resBookingUnauth.status === 401, 'POST /api/admin/bookings without auth returns 401 Unauthorized');

  // 1.6 Request with corrupted token
  const reqCorruptedToken = new NextRequest('http://localhost:3000/api/admin/leads', {
    method: 'GET',
    headers: { Authorization: 'Bearer invalid.corrupted.token' },
  });
  const resCorruptedToken = await getLeads(reqCorruptedToken);
  assert(resCorruptedToken.status === 401, 'Request with forged/corrupted token returns 401 Unauthorized');

  // 1.7 Request with valid signed cookie
  const reqValidCookie = new NextRequest('http://localhost:3000/api/admin/rooms', {
    method: 'GET',
    headers: { Cookie: `hss_admin_token=${validAdminToken}` },
  });
  const resValidCookie = await getRooms(reqValidCookie);
  assert(resValidCookie.status === 200, 'Request with valid signed admin cookie returns 200 OK');

  // =========================================================================
  // TEST GROUP 2: Login Rate Limiting & Brute-Force Defense
  // =========================================================================
  console.log('\n[TEST GROUP 2: Login Rate Limiting & Unauthorized Staff Actions]');

  const testIp = '198.51.100.99'; // RFC 5737 test IP
  // Reset rate limit for test IP
  for (let i = 0; i < 4; i++) {
    recordFailedLogin(testIp);
  }
  const checkBefore5 = checkLoginRateLimit(testIp);
  assert(checkBefore5.allowed === true, 'Under 5 failed attempts: login remains allowed');

  recordFailedLogin(testIp); // 5th failed attempt
  const checkAfter5 = checkLoginRateLimit(testIp);
  assert(checkAfter5.allowed === false, '5 failed attempts: IP is rate-limited and blocked');

  // Login endpoint rate limit response
  const reqBlockedLogin = new NextRequest('http://localhost:3000/api/admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': testIp,
    },
    body: JSON.stringify({ secretKey: 'wrong_secret_123' }),
  });
  const resBlockedLogin = await postLogin(reqBlockedLogin);
  assert(resBlockedLogin.status === 429, 'POST /api/admin/auth/login returns 429 Too Many Requests when blocked');

  // =========================================================================
  // TEST GROUP 3: Fake Phone Number Prevention
  // =========================================================================
  console.log('\n[TEST GROUP 3: Fake Phone Number Prevention]');

  const uniqueGuestId = `guest_nophone_${Date.now()}`;
  const resNoPhone = await processInboundMessage({
    channel: 'WEBSITE',
    senderId: uniqueGuestId,
    senderName: 'Tenzing Norgay',
    content: 'I want to reserve a room from Oct 20 to Oct 22 for 1 guest. My name is Tenzing Norgay',
  });

  // Verify no fabricated phone number was injected into Customer or Lead
  const customerRecord = await prisma.customer.findFirst({
    where: { id: resNoPhone.customerId },
  });
  const leadRecord = await prisma.lead.findFirst({
    where: { customerId: resNoPhone.customerId },
  });

  const hasFabricatedPhone =
    (customerRecord?.phone && customerRecord.phone.startsWith('+977-98')) ||
    (leadRecord?.phone && leadRecord.phone.startsWith('+977-98'));

  assert(!hasFabricatedPhone, 'Chatbot NEVER generates fake +977-98 phone numbers when guest gives none');
  assert(leadRecord?.phone === null || leadRecord?.phone === undefined, 'Lead phone correctly remains null/unset');

  // =========================================================================
  // TEST GROUP 4: Premature Confirmation Prevention (Inquiry vs Voucher)
  // =========================================================================
  console.log('\n[TEST GROUP 4: Premature Confirmation Prevention]');

  const bookingInquiryFlowUser = `web_inq_${Date.now()}`;
  // Progress chatbot through to completion
  const msg1 = await processInboundMessage({
    channel: 'WEBSITE',
    senderId: bookingInquiryFlowUser,
    senderName: 'Sarah Jenkins',
    content: 'Need room from 15 Nov to 18 Nov for 2 adults',
  });

  const completionMsg = await processInboundMessage({
    channel: 'WEBSITE',
    conversationId: msg1.conversationId,
    senderId: bookingInquiryFlowUser,
    content: 'Yes, please submit my booking inquiry. My name is Sarah Jenkins',
  });

  // Must NOT claim "Reservation Confirmed" or issue voucher
  const claimsConfirmed =
    completionMsg.reply?.includes('Booking Confirmed') ||
    completionMsg.reply?.includes('Voucher Confirmed') ||
    completionMsg.reply?.includes('Room Reserved!');
  assert(!claimsConfirmed, 'Bot completion does NOT falsely claim room is reserved');

  // Must return INQ reference with pending approval status
  const returnsInquiryRef = Boolean(
    completionMsg.reply?.includes('INQ-') || completionMsg.reply?.includes('Inquiry Reference')
  );
  assert(returnsInquiryRef, 'Bot completion returns an inquiry reference (INQ-XXXXX)');

  const mentionsPendingStaff = Boolean(
    completionMsg.reply?.includes('PENDING') ||
    completionMsg.reply?.includes('front desk') ||
    completionMsg.reply?.includes('staff')
  );
  assert(mentionsPendingStaff, 'Bot completion explicitly notifies guest that request is pending staff approval');

  // Verify database lead status is BOOKING_REQUEST, not CONFIRMED
  const verifiedLead = await prisma.lead.findFirst({
    where: { customerId: completionMsg.customerId },
    orderBy: { createdAt: 'desc' },
  });
  assert(verifiedLead?.leadStatus === 'BOOKING_REQUEST', 'Lead status in CRM is BOOKING_REQUEST, not CONFIRMED');

  // Verify NO Reservation record was created in database by chatbot
  const reservationsCount = await prisma.reservation.count({
    where: { customerId: completionMsg.customerId },
  });
  assert(reservationsCount === 0, 'Zero PMS reservations created by bot before staff approval');

  // =========================================================================
  // TEST GROUP 5: Staff PMS Approval & Failure Handling
  // =========================================================================
  console.log('\n[TEST GROUP 5: Staff Approval & PMS Failure Safety]');

  // Create a dedicated lead for PMS testing
  const uniquePhone = `+14155${Math.floor(100000 + Math.random() * 900000)}`;
  const testCustomer = await prisma.customer.create({
    data: {
      name: 'Michael Chang',
      email: `m.chang_${Date.now()}@example.com`,
      phone: uniquePhone,
      firstChannel: 'WEBSITE',
    },
  });

  const testLead = await prisma.lead.create({
    data: {
      customerId: testCustomer.id,
      name: 'Michael Chang',
      email: `m.chang_${Date.now()}@example.com`,
      phone: uniquePhone,
      channel: 'WEBSITE',
      leadStatus: 'BOOKING_REQUEST',
      roomType: 'Deluxe Room',
      checkIn: '2026-11-20',
      checkOut: '2026-11-23',
      adults: 2,
      roomsRequested: 1,
      estimatedValue: 60,
    },
  });

  // 5.1 Validation: Invalid date range rejected
  const invalidDateLead = await prisma.lead.create({
    data: {
      customerId: testCustomer.id,
      leadStatus: 'BOOKING_REQUEST',
      checkIn: '2026-11-25',
      checkOut: '2026-11-20', // Check-out before check-in!
    },
  });
  const reqInvalidDates = new NextRequest('http://localhost:3000/api/admin/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSecret}`,
    },
    body: JSON.stringify({ leadId: invalidDateLead.id, action: 'APPROVE' }),
  });
  const resInvalidDates = await postBooking(reqInvalidDates);
  assert(resInvalidDates.status === 400, 'Server validates dates: check-out <= check-in is rejected with 400');

  // 5.2 PMS Approval: Valid lead approval by staff
  const reqValidApproval = new NextRequest('http://localhost:3000/api/admin/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSecret}`,
    },
    body: JSON.stringify({ leadId: testLead.id, action: 'APPROVE' }),
  });
  const resValidApproval = await postBooking(reqValidApproval);
  const approvalData = await resValidApproval.json();

  if (resValidApproval.status === 200) {
    assert(approvalData.success === true, 'Staff approval succeeds when PMS confirms booking');
    assert(Boolean(approvalData.pmsBookingReference), 'Booking reference returned from PMS');

    // 5.3 Duplicate Approval Idempotency Test
    const reqDuplicateApproval = new NextRequest('http://localhost:3000/api/admin/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSecret}`,
      },
      body: JSON.stringify({ leadId: testLead.id, action: 'APPROVE' }),
    });
    const resDuplicateApproval = await postBooking(reqDuplicateApproval);
    const dupData = await resDuplicateApproval.json();

    assert(resDuplicateApproval.status === 200, 'Duplicate approval call returns 200 OK');
    assert(dupData.idempotent === true, 'Duplicate approval is idempotent and does not create duplicate booking');
    assert(dupData.pmsBookingReference === approvalData.pmsBookingReference, 'Returns existing booking reference');
  } else {
    // If PMS live network is unavailable in offline dev environment, verify safe failure behavior (502)
    assert(resValidApproval.status === 502, 'PMS network failure returns 502 Bad Gateway without false confirmation');
    const leadAfterFailure = await prisma.lead.findUnique({ where: { id: testLead.id } });
    assert(leadAfterFailure?.leadStatus === 'BOOKING_REQUEST', 'Lead remains BOOKING_REQUEST on PMS failure');
  }

  // =========================================================================
  // TEST GROUP 6: Website Chat Session Isolation (Concurrent Visitors)
  // =========================================================================
  console.log('\n[TEST GROUP 6: Website Chat Session Isolation]');

  // Visitor A starts session
  const reqVisitorA_1 = new NextRequest('http://localhost:3000/api/chat/website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from Visitor A, I am looking for a room.' }),
  });
  const resVisitorA_1 = await postWebsiteChat(reqVisitorA_1);
  const dataA_1 = await resVisitorA_1.json();

  assert(Boolean(dataA_1.conversationId), 'Visitor A receives unique conversationId');
  assert(Boolean(dataA_1.sessionToken), 'Visitor A receives signed sessionToken');

  // Visitor B starts session concurrently
  const reqVisitorB_1 = new NextRequest('http://localhost:3000/api/chat/website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from Visitor B, what are your rates?' }),
  });
  const resVisitorB_1 = await postWebsiteChat(reqVisitorB_1);
  const dataB_1 = await resVisitorB_1.json();

  assert(Boolean(dataB_1.conversationId), 'Visitor B receives unique conversationId');
  assert(dataA_1.conversationId !== dataB_1.conversationId, 'Visitor A and Visitor B have distinct conversation IDs');

  // Verify HMAC tokens are valid for their respective sessions
  const verifyTokenA = verifyVisitorSessionToken(dataA_1.sessionToken);
  const verifyTokenB = verifyVisitorSessionToken(dataB_1.sessionToken);
  assert(verifyTokenA.isValid && verifyTokenA.conversationId === dataA_1.conversationId, 'Token A cryptographically matches Conversation A');
  assert(verifyTokenB.isValid && verifyTokenB.conversationId === dataB_1.conversationId, 'Token B cryptographically matches Conversation B');

  // Attack Test 1: Visitor A attempts to use Visitor B's conversationId with Token A (Session Hijack)
  const reqHijack = new NextRequest('http://localhost:3000/api/chat/website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: dataB_1.conversationId,
      sessionToken: dataA_1.sessionToken, // mismatched signature!
      message: 'Malicious message trying to inject into Visitor B',
    }),
  });
  const resHijack = await postWebsiteChat(reqHijack);
  assert(resHijack.status === 401, 'Mismatched session token and conversation ID rejected with 401');

  // Attack Test 2: Arbitrary conversationId without sessionToken
  const reqArbitraryId = new NextRequest('http://localhost:3000/api/chat/website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: dataB_1.conversationId,
      message: 'Unsigned arbitrary conversation ID injection',
    }),
  });
  const resArbitraryId = await postWebsiteChat(reqArbitraryId);
  assert(resArbitraryId.status === 401, 'Arbitrary unauthenticated conversation ID rejected with 401');

  // Data Isolation: Fetching history for Session A only returns Session A messages
  const reqHistoryA = new NextRequest(
    `http://localhost:3000/api/chat/website?token=${encodeURIComponent(dataA_1.sessionToken)}`,
    { method: 'GET' }
  );
  const resHistoryA = await getWebsiteChat(reqHistoryA);
  const historyDataA = await resHistoryA.json();

  assert(resHistoryA.status === 200, 'GET /api/chat/website with valid sessionToken returns 200');
  assert(historyDataA.conversationId === dataA_1.conversationId, 'Returned history is strictly scoped to Conversation A');
  const containsVisitorBText = historyDataA.messages.some((m: any) => m.text.includes('Visitor B'));
  assert(!containsVisitorBText, 'Conversation A history contains ZERO messages from Conversation B (No cross-session leakage)');

  // =========================================================================
  // TEST GROUP 7: Production Secret Enforcement (Blocker 1)
  // =========================================================================
  console.log('\n[TEST GROUP 7: Production Secret Enforcement]');

  const origNodeEnv = process.env.NODE_ENV;
  const origSecret = process.env.ADMIN_SECRET_KEY;

  try {
    // 7.1 Production mode with missing key fails securely
    (process.env as any).NODE_ENV = 'production';
    delete process.env.ADMIN_SECRET_KEY;

    let threwMissing = false;
    try {
      getAdminSecretKey();
    } catch (e: any) {
      threwMissing = e.message.includes('mandatory');
    }
    assert(threwMissing, 'In production, missing ADMIN_SECRET_KEY throws explicit security error');

    // 7.2 Production mode with short/weak key (< 32 chars) fails securely
    process.env.ADMIN_SECRET_KEY = 'short_key_123';
    let threwShort = false;
    try {
      getAdminSecretKey();
    } catch (e: any) {
      threwShort = e.message.includes('at least 32 characters');
    }
    assert(threwShort, 'In production, key under 32 characters throws explicit security error');

    // 7.3 Production mode with valid strong key (>= 32 chars) succeeds
    const strongKey = 'sherpa_soul_production_admin_secret_key_64_characters_super_secure!';
    process.env.ADMIN_SECRET_KEY = strongKey;
    const returnedKey = getAdminSecretKey();
    assert(returnedKey === strongKey, 'In production, strong key >= 32 chars is accepted');
  } finally {
    // Restore environment
    (process.env as any).NODE_ENV = origNodeEnv;
    if (origSecret) {
      process.env.ADMIN_SECRET_KEY = origSecret;
    } else {
      delete process.env.ADMIN_SECRET_KEY;
    }
  }

  // =========================================================================
  // TEST GROUP 8: Edge Middleware Cryptographic Verification (Blocker 3)
  // =========================================================================
  console.log('\n[TEST GROUP 8: Edge Middleware Web Crypto Verification]');

  // 8.1 Valid token verification via Web Crypto
  const edgeValidResult = await verifyAdminTokenEdge(validAdminToken);
  assert(edgeValidResult.valid === true, 'verifyAdminTokenEdge successfully verifies valid HMAC token using Web Crypto');

  // 8.2 Tampered token rejected by Edge
  const tamperedEdgeToken = validAdminToken.slice(0, -5) + 'xxxxx';
  const edgeTamperedResult = await verifyAdminTokenEdge(tamperedEdgeToken);
  assert(edgeTamperedResult.valid === false, 'verifyAdminTokenEdge rejects tampered signature');

  // 8.3 Corrupted format rejected by Edge
  const edgeInvalidFormatResult = await verifyAdminTokenEdge('invalid-not-a-token');
  assert(edgeInvalidFormatResult.valid === false, 'verifyAdminTokenEdge rejects invalid token format');

  // =========================================================================
  // TEST GROUP 9: Concurrency Conflict & Duplicate Approval Protection (Blocker 4)
  // =========================================================================
  console.log('\n[TEST GROUP 9: Duplicate Booking Approval Protection & Concurrency Lease]');

  // Create isolated test lead with status 'PROCESSING'
  const concurrencyCustomer = await prisma.customer.create({
    data: {
      name: 'Concurrency Test Guest',
      phone: '+9779800000099',
      firstChannel: 'WEBSITE',
    },
  });

  const processingLead = await prisma.lead.create({
    data: {
      customerId: concurrencyCustomer.id,
      name: 'Concurrency Test Guest',
      phone: '+9779800000099',
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      leadStatus: 'PROCESSING', // Simulating another staff member in-flight
      conversationStatus: 'OPEN',
    },
  });

  // Attempt duplicate approval while lead is PROCESSING
  const reqConcurrentApproval = new NextRequest('http://localhost:3000/api/admin/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `hss_admin_token=${validAdminToken}`,
    },
    body: JSON.stringify({
      leadId: processingLead.id,
      guestName: 'Concurrency Test Guest',
      guestPhone: '+9779800000099',
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-03',
    }),
  });

  const resConcurrentApproval = await postBooking(reqConcurrentApproval);
  assert(
    resConcurrentApproval.status === 409,
    'Simultaneous approval while lead is PROCESSING returns 409 Conflict'
  );
  const concurrentData = await resConcurrentApproval.json();
  assert(concurrentData.inProgress === true, 'Response indicates booking is already in progress');

  // Clean up test records
  await prisma.lead.delete({ where: { id: processingLead.id } });
  await prisma.customer.delete({ where: { id: concurrencyCustomer.id } });

  // =========================================================================
  // TEST GROUP 10: PII-Safe Logging & Masking (Blocker 5)
  // =========================================================================
  console.log('\n[TEST GROUP 10: PII Masking Utilities]');

  const maskedFullPhone = maskPhoneNumber('+9779818259472');
  assert(
    maskedFullPhone.includes('****') && !maskedFullPhone.includes('825'),
    'maskPhoneNumber masks middle digits of international phone (+97798****472)'
  );

  const maskedLocalPhone = maskPhoneNumber('9818259472');
  assert(
    maskedLocalPhone.includes('****') && !maskedLocalPhone.includes('825'),
    'maskPhoneNumber masks middle digits of 10-digit phone'
  );

  const maskedNullPhone = maskPhoneNumber(null);
  assert(maskedNullPhone === '***', 'maskPhoneNumber safely handles null input without throwing');

  const maskedSec = maskSecret('production_secret_key_super_long_32chars!');
  assert(
    maskedSec.includes('[REDACTED') && !maskedSec.includes('super_long'),
    'maskSecret redacts secret token value'
  );

  console.log('\n======================================================');
  console.log(`PHASE 1 SECURITY SUITE SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecuritySuite()
  .catch((e) => {
    console.error('Fatal error during security test suite:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
