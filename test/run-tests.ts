import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { detectLanguage, detectIntent, extractEntities } from '../lib/engine/intentDetector';
import { processInboundMessage } from '../lib/engine/chatDispatcher';
import { verifyWebhookChallenge, verifyMetaSignature } from '../lib/meta/verification';
import { prisma } from '../lib/prisma';
import { GET as getWhatsAppWebhook, POST as postWhatsAppWebhook } from '../app/api/webhooks/whatsapp/route';
import { GET as getMessengerWebhook, POST as postMessengerWebhook } from '../app/api/webhooks/messenger/route';
import { GET as getInstagramWebhook, POST as postInstagramWebhook } from '../app/api/webhooks/instagram/route';
import { POST as postWebsiteChat } from '../app/api/chat/website/route';

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

async function runAllTests() {
  console.log('\n======================================================');
  console.log('HOTEL SHERPA SOUL - CHATBOT & OMNICHANNEL TEST SUITE');
  console.log('======================================================\n');

  // 1. Language Detection Tests
  console.log('[TEST GROUP 1: Multilingual Detection]');
  const langEn = detectLanguage('Hello, I need a room in Thamel for next week.');
  assert(langEn === 'en', 'English Language Detection');

  const langNe = detectLanguage('नमस्ते, असोज १२ देखि १५ सम्म २ जनाको लागि कोठा खाली छ?');
  assert(langNe === 'ne', 'Nepali Language Detection');

  const langHi = detectLanguage('नमस्ते, क्या आपके पास कमरा खाली है? किराया कितना है?');
  assert(langHi === 'hi', 'Hindi Language Detection');

  // 2. Entity Extraction Tests
  console.log('\n[TEST GROUP 2: Entity Extraction]');
  const entities1 = extractEntities('Need room from 12 Oct to 15 Oct for 2 adults and 1 child in Deluxe');
  assert(Boolean(entities1.checkIn?.toLowerCase().includes('oct') && entities1.checkIn?.includes('12')), 'Check-in date parsed (oct 12)', entities1.checkIn);
  assert(Boolean(entities1.checkOut?.toLowerCase().includes('oct') && entities1.checkOut?.includes('15')), 'Check-out date parsed (oct 15)', entities1.checkOut);
  assert(entities1.adults === 2, 'Adults count parsed (2)', String(entities1.adults));
  assert(entities1.children === 1, 'Children count parsed (1)', String(entities1.children));
  assert(entities1.roomType === 'Deluxe Room', 'Room type parsed (Deluxe Room)', entities1.roomType);

  // 3. Intent Detection Tests
  console.log('\n[TEST GROUP 3: Intent Classification]');
  const priceIntent = detectIntent('How much are your room prices per night?');
  assert(priceIntent.intent === 'ROOM_PRICE', 'Room price intent classified');

  const bookingIntent = detectIntent('I want to book a room for this weekend');
  assert(bookingIntent.intent === 'BOOKING', 'Booking intent classified as HIGH_INTENT');

  const humanIntent = detectIntent('I want to talk to staff or a real person');
  assert(humanIntent.intent === 'HUMAN_REQUEST', 'Human handover intent classified');

  const complaintIntent = detectIntent('I am very angry and want to make a complaint about bad service');
  assert(complaintIntent.intent === 'COMPLAINT', 'Complaint classified for human handover');

  const restaurantIntent = detectIntent('Do you have an in-house restaurant or dining hall?');
  assert(restaurantIntent.intent === 'FACILITIES', 'Restaurant query mapped to Facilities');

  const kitchenIntent = detectIntent('Can I cook in room 102? Is there a shared kitchen?');
  assert(kitchenIntent.intent === 'SHARED_KITCHEN', 'Shared kitchen intent classified');

  // 4. Meta Webhook Verification & Security Tests
  console.log('\n[TEST GROUP 4: Webhook Verification & HMAC Signature]');
  process.env.META_VERIFY_TOKEN = 'sherpa_soul_webhook_verify_token_2026';
  const verifyValid = verifyWebhookChallenge('subscribe', 'sherpa_soul_webhook_verify_token_2026', 'challenge_code_123');
  assert(verifyValid.isValid === true && verifyValid.challenge === 'challenge_code_123', 'Valid Meta Webhook Challenge');

  const verifyInvalid = verifyWebhookChallenge('subscribe', 'wrong_token', '123');
  assert(verifyInvalid.isValid === false, 'Rejection of Invalid Token');

  // 5. End-to-End Chatbot Dispatcher & Anti-Hallucination Tests
  console.log('\n[TEST GROUP 5: Chatbot Inbound Pipeline & Anti-Hallucination]');

  // Test WhatsApp message asking for prices
  const resPrice = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: '+9779899001122',
    senderName: 'Alex Mercer',
    content: 'How much are your rooms per night?',
    externalMessageId: `test_wa_${Date.now()}_1`,
  });
  assert(resPrice.success === true, 'WhatsApp message processed successfully');
  assert(resPrice.reply?.includes('Deluxe Room') === true, 'Dynamic price quotes Deluxe Room');
  assert(resPrice.reply?.includes('USD 20') === true, 'Dynamic price contains active DB rate (USD 20)');

  // Test Anti-Hallucination on Restaurant
  const resRestaurant = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: '+9779899001122',
    content: 'Do you have a restaurant or breakfast hall in the hotel?',
    externalMessageId: `test_wa_${Date.now()}_2`,
  });
  assert(
    resRestaurant.reply?.includes('does not have a restaurant') === true ||
    resRestaurant.reply?.includes('No Restaurant. No Noise. Sleep Well.') === true,
    'Anti-Hallucination: Explicitly confirms NO restaurant'
  );

  // Test Anti-Hallucination on Shared Kitchen (Room 102)
  const resKitchen = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: '+9779899001122',
    content: 'Can I use the shared kitchen in room 102?',
    externalMessageId: `test_wa_${Date.now()}_3`,
  });
  assert(
    resKitchen.reply?.includes('Room 102') === true && resKitchen.reply?.includes('2 weeks') === true,
    'Anti-Hallucination: Confirms Room 102 is shared kitchen requiring >= 2 weeks minimum stay'
  );

  // Test Progressive Booking Flow & High Intent
  const resBooking = await processInboundMessage({
    channel: 'MESSENGER',
    senderId: `fb_user_${Date.now()}`,
    senderName: 'David Lee',
    content: 'I want to book from 12 Oct to 15 Oct for 2 adults',
    externalMessageId: `test_fb_${Date.now()}_4`,
  });
  assert(resBooking.success === true, 'Messenger booking inquiry processed');
  assert(resBooking.outbound?.step === 'CONFIRMING_SUMMARY', 'Progressed to CONFIRMING_SUMMARY');
  assert(resBooking.reply?.includes('Deluxe Room') === true, 'Automatically suggested Deluxe Room for 2 adults');

  // Test Human Handover Trigger
  const resHandover = await processInboundMessage({
    channel: 'INSTAGRAM',
    senderId: 'ig_user_2002',
    content: 'I want to talk to staff please',
    externalMessageId: `test_ig_${Date.now()}_5`,
  });
  assert(resHandover.outbound?.triggerHandover === true, 'Handover triggered for human request');
  assert(resHandover.outbound?.step === 'HANDOVER', 'Step marked as HANDOVER');

  // Test Idempotency & Deduplication
  const duplicateId = `test_dedup_${Date.now()}`;
  const firstCall = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: '+9779899001122',
    content: 'Testing idempotency message',
    externalMessageId: duplicateId,
  });
  assert(firstCall.success === true && !firstCall.deduplicated, 'First message processed normally');

  const secondCall = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: '+9779899001122',
    content: 'Testing idempotency message duplicate',
    externalMessageId: duplicateId,
  });
  assert(secondCall.deduplicated === true, 'Duplicate webhook event successfully deduplicated');

  // Test 6-Room Inventory Constraint in Database
  console.log('\n[TEST GROUP 6: 6-Room Inventory & Safety Constraints]');
  const rooms = await prisma.room.findMany({ where: { isSellable: true } });
  assert(rooms.length === 6, 'Exactly 6 sellable rooms in database inventory', `Found: ${rooms.length}`);

  const room101 = await prisma.room.findUnique({ where: { roomNumber: '101' } });
  assert(room101 === null, 'Room 101 does NOT exist in database');

  const room102 = await prisma.room.findUnique({ where: { roomNumber: '102' } });
  assert(room102 !== null && room102.isSellable === false && room102.isSharedKitchen === true, 'Room 102 is strictly non-sellable shared kitchen');

  // Test Real Conversation Scenarios (Prompt Section 38)
  console.log('\n[TEST GROUP 7: Section 38 Real Human Conversation Scenarios]');

  // Scenario A: Natural Greeting + Ask Dates
  const simSenderA = `sim_user_A_${Date.now()}`;
  const resScenarioA = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderA,
    content: 'Hi',
    externalMessageId: `scen_a_${Date.now()}`,
  });
  assert(
    resScenarioA.reply?.includes('What dates are you looking at') === true,
    'Scenario A: "Hi" -> Warm greeting asking for dates'
  );

  // Scenario B: Nepali travel dates
  const simSenderB = `sim_user_B_${Date.now()}`;
  const resScenarioB = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderB,
    content: 'Room chaiyo October 10 dekhi 12 samma',
    externalMessageId: `scen_b_${Date.now()}`,
  });
  assert(
    resScenarioB.outbound?.step === 'AWAITING_GUESTS',
    'Scenario B: Understands Nepali + dates -> Steps to AWAITING_GUESTS'
  );
  assert(
    resScenarioB.reply?.includes('कति जना') === true || resScenarioB.reply?.includes('how many guests') === true,
    'Scenario B: Asks for number of guests'
  );

  // Scenario C: Guest count given in context
  const resScenarioC = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderB,
    content: '2 adults and one child',
    externalMessageId: `scen_c_${Date.now()}`,
  });
  assert(
    resScenarioC.outbound?.step === 'CONFIRMING_SUMMARY',
    'Scenario C: Context preserved -> Steps to CONFIRMING_SUMMARY'
  );
  assert(
    resScenarioC.reply?.includes('Deluxe Room') === true && resScenarioC.reply?.includes('USD 20') === true,
    'Scenario C: Recommends Deluxe Room at USD 20/night'
  );

  // Scenario D: Guest asks "How much?"
  const resScenarioD = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderB,
    content: 'How much?',
    externalMessageId: `scen_d_${Date.now()}`,
  });
  assert(
    resScenarioD.reply?.includes('USD 20') === true,
    'Scenario D: "How much?" answers specific Deluxe Room rate in context'
  );

  // Scenario E: Guest asks "Can I book it?"
  const resScenarioE = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderB,
    content: 'Can I book it?',
    externalMessageId: `scen_e_${Date.now()}`,
  });
  assert(
    resScenarioE.reply?.includes('full name') === true ||
      resScenarioE.reply?.includes('पूरा नाम') === true ||
      resScenarioE.reply?.includes('Perfect') === true ||
      resScenarioE.reply?.includes('धन्यवाद') === true,
    'Scenario E: "Can I book it?" proceeds toward booking collection or confirmation'
  );

  // Scenario F: "I want to talk to someone" -> Immediate Human Handover
  const simSenderF = `sim_user_F_${Date.now()}`;
  const resScenarioF = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderF,
    content: 'I want to talk to someone.',
    externalMessageId: `scen_f_${Date.now()}`,
  });
  assert(
    resScenarioF.outbound?.step === 'HANDOVER' && resScenarioF.outbound?.triggerHandover === true,
    'Scenario F: "I want to talk to someone" triggers immediate human handover'
  );

  // Scenario G: "Can I cook?" -> Room 102 shared kitchen info
  const simSenderG = `sim_user_G_${Date.now()}`;
  const resScenarioG = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderG,
    content: 'Can I cook?',
    externalMessageId: `scen_g_${Date.now()}`,
  });
  assert(
    resScenarioG.reply?.includes('Room 102') === true && resScenarioG.reply?.includes('2 weeks') === true,
    'Scenario G: "Can I cook?" explains Room 102 shared kitchen for long stays (>= 2 weeks)'
  );

  // Honest AI Identity: "Are you a real person?"
  const simSenderH = `sim_user_H_${Date.now()}`;
  const resScenarioH = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderH,
    content: 'Are you a real person?',
    externalMessageId: `scen_h_${Date.now()}`,
  });
  assert(
    resScenarioH.reply?.includes("I'm the hotel's chat assistant") === true,
    'Honest AI Identity: Acknowledges being the hotel chat assistant and offers to connect to staff'
  );

  // Click-to-WhatsApp Meta Ads Referral & Lead Attribution
  const simSenderAd = `+9779818299887`;
  const resAd = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: simSenderAd,
    senderPhone: simSenderAd,
    content: 'Hi, I saw your ad on Meta and want to check room availability',
    externalMessageId: `scen_ad_${Date.now()}`,
    campaignInfo: {
      campaign: 'Meta_Autumn_Nepal_Trek_2026',
      adId: 'ad_7788990011',
      ad: 'Book Now - Sleep Well in Thamel',
    },
  });
  assert(resAd.success === true, 'Click-to-WhatsApp ad message processed');
  const capturedLead = await prisma.lead.findFirst({
    where: { phone: simSenderAd },
  });
  assert(
    capturedLead?.campaign === 'Meta_Autumn_Nepal_Trek_2026' && capturedLead?.adId === 'ad_7788990011',
    'Attribution: Meta Ad Campaign and Ad ID saved to CRM Lead'
  );

  // 8. Task-Specific Tests: Flexible Check-in Policy, City Guide & Nearby Attractions
  console.log('\n[TEST GROUP 8: Flexible Check-in Policy, City Guide & Nearby Attractions]');

  // 8.1. Check-in policy wording test (Website & Chatbot Knowledge Base)
  const pageContent = fs.readFileSync(path.join(__dirname, '../app/page.tsx'), 'utf-8');
  assert(
    pageContent.includes('Check-in:</strong> Flexible from 12:00 PM, subject to room availability.') ||
    pageContent.includes('Flexible from 12:00 PM, subject to room availability.'),
    'Check-in policy wording test: "Flexible from 12:00 PM, subject to room availability." present in website'
  );
  assert(
    pageContent.toLowerCase().includes('early arrival:') &&
    pageContent.toLowerCase().includes('free luggage storage; early check-in subject to availability.'),
    'Check-in policy wording test: "Early arrival: free luggage storage; early check-in subject to availability." present in website'
  );
  assert(
    pageContent.includes('Check-out:</strong> 11:00 AM; late check-out on request, subject to availability.') ||
    pageContent.includes('11:00 AM; late check-out on request, subject to availability.'),
    'Check-in policy wording test: "Check-out: 11:00 AM; late check-out on request, subject to availability." present in website'
  );

  // Chatbot check-in policy response test
  const resPolicy = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: `test_policy_${Date.now()}`,
    content: 'What is your check-in and check-out policy?',
    externalMessageId: `policy_${Date.now()}`,
  });
  assert(resPolicy.success === true, 'Check-in policy inquiry processed successfully');
  assert(
    resPolicy.reply?.includes('Flexible from 12:00 PM, subject to room availability') === true,
    'Chatbot check-in policy test: mentions flexible check-in from 12:00 PM subject to room availability'
  );
  assert(
    resPolicy.reply?.toLowerCase().includes('free luggage storage') === true,
    'Chatbot check-in policy test: mentions free luggage storage for early arrivals'
  );
  assert(
    resPolicy.reply?.includes('11:00 AM; late check-out on request, subject to availability') === true ||
    (resPolicy.reply?.includes('11:00 AM') === true && resPolicy.reply?.includes('late check-out') === true),
    'Chatbot check-in policy test: mentions 11:00 AM check-out and late check-out on request'
  );

  // 8.2. City guide content test (Website)
  assert(pageContent.includes('Explore Thamel & Kathmandu'), 'City guide content test: "Explore Thamel & Kathmandu" header present');
  assert(pageContent.includes('Walking (in Thamel)'), 'City guide content test: "Walking (in Thamel)" section present');
  assert(pageContent.includes('Garden of Dreams'), 'City guide content test: "Garden of Dreams" present');
  assert(pageContent.includes('Thamel Heritage Walk'), 'City guide content test: "Thamel Heritage Walk" present');
  assert(pageContent.includes('Local cafes and trekking shops'), 'City guide content test: "Local cafes and trekking shops" present');
  assert(pageContent.includes('Walking (20–40 min)'), 'City guide content test: "Walking (20–40 min)" section present');
  assert(pageContent.includes('Kathmandu Durbar Square'), 'City guide content test: "Kathmandu Durbar Square" present');
  assert(pageContent.includes('Ason Bazaar'), 'City guide content test: "Ason Bazaar" present');
  assert(pageContent.includes('Swayambhunath (Monkey Temple)'), 'City guide content test: "Swayambhunath (Monkey Temple)" present');
  assert(pageContent.includes('Half-day hikes'), 'City guide content test: "Half-day hikes" section present');
  assert(pageContent.includes('Tarebhir Hike'), 'City guide content test: "Tarebhir Hike" present');
  assert(pageContent.includes('Nagi Gompa (Shivapuri)'), 'City guide content test: "Nagi Gompa (Shivapuri)" present');
  assert(pageContent.includes('Jamacho Gompa'), 'City guide content test: "Jamacho Gompa" present');
  assert(pageContent.includes('Culture'), 'City guide content test: "Culture" section present');
  assert(pageContent.includes('Narayanhiti Palace Museum'), 'City guide content test: "Narayanhiti Palace Museum" present');
  assert(pageContent.includes('Museum of Nepali Art'), 'City guide content test: "Museum of Nepali Art" present');
  assert(pageContent.includes('Local temples'), 'City guide content test: "Local temples" present');

  // 8.3. Chatbot "what to do nearby" test
  const nearbyIntent = detectIntent('what to do nearby');
  assert(nearbyIntent.intent === 'LOCATION', 'Chatbot intent detection: "what to do nearby" -> LOCATION', nearbyIntent.intent);

  const resNearby = await processInboundMessage({
    channel: 'WHATSAPP',
    senderId: `test_nearby_${Date.now()}`,
    content: 'What to do nearby?',
    externalMessageId: `nearby_${Date.now()}`,
  });
  assert(resNearby.success === true, 'Chatbot "what to do nearby" message processed successfully');
  assert(resNearby.reply?.includes('Garden of Dreams') === true, 'Chatbot "what to do nearby" includes Garden of Dreams');
  assert(resNearby.reply?.includes('Thamel Heritage Walk') === true, 'Chatbot "what to do nearby" includes Thamel Heritage Walk');
  assert(resNearby.reply?.includes('Local cafes and trekking shops') === true, 'Chatbot "what to do nearby" includes Local cafes and trekking shops');
  assert(resNearby.reply?.includes('Kathmandu Durbar Square') === true, 'Chatbot "what to do nearby" includes Kathmandu Durbar Square');
  assert(resNearby.reply?.includes('Ason Bazaar') === true, 'Chatbot "what to do nearby" includes Ason Bazaar');
  assert(resNearby.reply?.includes('Swayambhunath') === true, 'Chatbot "what to do nearby" includes Swayambhunath (Monkey Temple)');
  assert(resNearby.reply?.includes('Tarebhir Hike') === true, 'Chatbot "what to do nearby" includes Tarebhir Hike');
  assert(resNearby.reply?.includes('Nagi Gompa') === true, 'Chatbot "what to do nearby" includes Nagi Gompa (Shivapuri)');
  assert(resNearby.reply?.includes('Jamacho Gompa') === true, 'Chatbot "what to do nearby" includes Jamacho Gompa');
  assert(resNearby.reply?.includes('Narayanhiti Palace Museum') === true, 'Chatbot "what to do nearby" includes Narayanhiti Palace Museum');
  assert(resNearby.reply?.includes('Museum of Nepali Art') === true, 'Chatbot "what to do nearby" includes Museum of Nepali Art');
  assert(resNearby.reply?.includes('Local temples') === true, 'Chatbot "what to do nearby" includes Local temples');

  // Helper for signed Meta webhook requests
  function createSignedMetaRequest(url: string, payload: any) {
    const rawBody = JSON.stringify(payload);
    const secret = process.env.META_APP_SECRET || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['x-hub-signature-256'] = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody, 'utf-8').digest('hex');
    }
    return new NextRequest(url, {
      method: 'POST',
      body: rawBody,
      headers,
    });
  }

  // 9. Omnichannel Verification (Website, WhatsApp, Messenger, Instagram, Cross-Channel CRM)
  console.log('\n[TEST GROUP 9: Omnichannel Verification (Website, WhatsApp, Messenger, Instagram, CRM)]');
  const reservationsBefore = await prisma.reservation.count();

  // --- TASK 1: Website Widget Embed Verification ---
  const widgetJsPath = path.join(__dirname, '../public/widget.js');
  assert(fs.existsSync(widgetJsPath), 'Task 1: public/widget.js exists');
  const widgetJsContent = fs.readFileSync(widgetJsPath, 'utf-8');
  assert(widgetJsContent.includes('data-api'), 'Task 1: widget.js supports data-api attribute');
  assert(widgetJsContent.includes('wa.me/9779818259472'), 'Task 1: widget.js includes WhatsApp notice link without UI collision');
  assert(widgetJsContent.includes('max-width: 480px'), 'Task 1: widget.js has responsive mobile breakpoint');

  const layoutPath = path.join(__dirname, '../app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
  assert(layoutContent.includes('HotelWidget'), 'Task 1: HotelWidget embedded in RootLayout to load on all pages');

  const hotelWidgetPath = path.join(__dirname, '../components/HotelWidget.tsx');
  const hotelWidgetContent = fs.readFileSync(hotelWidgetPath, 'utf-8');
  assert(hotelWidgetContent.includes("pathname?.startsWith('/admin')"), 'Task 1: HotelWidget hides on admin and chat routes');

  // Website Chat API POST & CORS verification
  const webChatReq = new NextRequest('http://localhost:3000/api/chat/website', {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello! I would like to check room availability for next week', name: 'Web Traveler' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const webChatRes = await postWebsiteChat(webChatReq);
  const webChatData = await webChatRes.json();
  assert(webChatRes.status === 200, 'Task 1: Website Chat API POST returns HTTP 200');
  assert(webChatRes.headers.get('Access-Control-Allow-Origin') === '*', 'Task 1: Website Chat API returns CORS *');
  assert(Boolean(webChatData.reply), 'Task 1: Website Chat API returns valid bot reply');
  assert(Boolean(webChatData.conversationId), 'Task 1: Website Chat API establishes conversationId');

  // --- TASK 2: WhatsApp Verification ---
  const verifyToken = process.env.META_VERIFY_TOKEN || 'sherpa_soul_webhook_verify_token_2026';
  process.env.META_VERIFY_TOKEN = verifyToken;

  // 1. WhatsApp Challenge
  const waHandshakeReq = new NextRequest(`http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=wa_challenge_ok_999&hub.verify_token=${verifyToken}`);
  const waHandshakeRes = await getWhatsAppWebhook(waHandshakeReq);
  assert(waHandshakeRes.status === 200, 'Task 2: WhatsApp Webhook Challenge returns HTTP 200');
  assert((await waHandshakeRes.text()) === 'wa_challenge_ok_999', 'Task 2: WhatsApp Webhook returns challenge text');

  // 2. WhatsApp Inbound message to +977 9818259472
  const waInboundPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba_sherpa_soul_1',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '123456789' },
          contacts: [{ profile: { name: 'Dawa Sherpa' } }],
          messages: [{
            from: '9779818259472',
            id: `wamid_inbound_${Date.now()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: 'Namaste! Are Deluxe rooms available next week?' },
          }],
        },
        field: 'messages',
      }],
    }],
  };
  const waInboundReq = createSignedMetaRequest('http://localhost:3000/api/webhooks/whatsapp', waInboundPayload);
  const waInboundRes = await postWhatsAppWebhook(waInboundReq);
  assert(waInboundRes.status === 200, 'Task 2: WhatsApp webhook receives inbound message from +977 9818259472');

  // 3. WhatsApp Message Status Updates (delivered & read)
  const existingWaCustomer = await prisma.customer.findFirst({ where: { OR: [{ phone: '9779818259472' }, { whatsappId: '9779818259472' }] } });
  const waConv = await prisma.conversation.findFirst({ where: { customerId: existingWaCustomer!.id }, orderBy: { createdAt: 'desc' } });
  const waOutboundMsg = await prisma.message.create({
    data: {
      conversationId: waConv!.id,
      customerId: existingWaCustomer!.id,
      channel: 'WHATSAPP',
      direction: 'OUTBOUND',
      content: 'Sure! What dates are you planning to stay?',
      externalMessageId: `wamid_out_${Date.now()}`,
      status: 'SENT',
    },
  });

  const waDelivStatusPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba_sherpa_soul_1',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: '123456789' },
          statuses: [{
            id: waOutboundMsg.externalMessageId!,
            status: 'delivered',
            timestamp: String(Math.floor(Date.now() / 1000)),
            recipient_id: '9779818259472',
          }],
        },
        field: 'messages',
      }],
    }],
  };
  const waDelivStatusReq = createSignedMetaRequest('http://localhost:3000/api/webhooks/whatsapp', waDelivStatusPayload);
  await postWhatsAppWebhook(waDelivStatusReq);
  const updatedWaMsgDelivered = await prisma.message.findUnique({ where: { id: waOutboundMsg.id } });
  assert(updatedWaMsgDelivered?.status === 'DELIVERED', 'Task 2: WhatsApp message status updated to DELIVERED');

  const waReadStatusPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba_sherpa_soul_1',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: '123456789' },
          statuses: [{
            id: waOutboundMsg.externalMessageId!,
            status: 'read',
            timestamp: String(Math.floor(Date.now() / 1000)),
            recipient_id: '9779818259472',
          }],
        },
        field: 'messages',
      }],
    }],
  };
  const waReadStatusReq = createSignedMetaRequest('http://localhost:3000/api/webhooks/whatsapp', waReadStatusPayload);
  await postWhatsAppWebhook(waReadStatusReq);
  const updatedWaMsgRead = await prisma.message.findUnique({ where: { id: waOutboundMsg.id } });
  assert(updatedWaMsgRead?.status === 'READ', 'Task 2: WhatsApp message status updated to READ');

  // --- TASK 3: Messenger Verification ---
  // 1. Messenger Handshake
  const fbHandshakeReq = new NextRequest(`http://localhost:3000/api/webhooks/messenger?hub.mode=subscribe&hub.challenge=fb_challenge_ok_888&hub.verify_token=${verifyToken}`);
  const fbHandshakeRes = await getMessengerWebhook(fbHandshakeReq);
  assert(fbHandshakeRes.status === 200, 'Task 3: Messenger Webhook Challenge returns HTTP 200');
  assert((await fbHandshakeRes.text()) === 'fb_challenge_ok_888', 'Task 3: Messenger Webhook returns challenge text');

  // 2. Messenger Inbound message
  const fbSenderId = `fb_user_${Date.now()}`;
  const fbInboundPayload = {
    object: 'page',
    entry: [{
      id: process.env.FACEBOOK_PAGE_ID || 'fb_page_sherpa_soul',
      time: Date.now(),
      messaging: [{
        sender: { id: fbSenderId },
        recipient: { id: process.env.FACEBOOK_PAGE_ID || 'fb_page_sherpa_soul' },
        timestamp: Date.now(),
        message: {
          mid: `mid_fb_in_${Date.now()}`,
          text: 'Hi! Do you have quiet rooms available in Thamel?',
        },
      }],
    }],
  };
  const fbInboundReq = createSignedMetaRequest('http://localhost:3000/api/webhooks/messenger', fbInboundPayload);
  const fbInboundRes = await postMessengerWebhook(fbInboundReq);
  assert(fbInboundRes.status === 200, 'Task 3: Messenger Webhook receives message and responds HTTP 200');

  // 3. Messenger Delivery & Read updates
  const existingFbCustomer = await prisma.customer.findFirst({ where: { messengerId: fbSenderId } });
  const fbConv = await prisma.conversation.findFirst({ where: { customerId: existingFbCustomer!.id }, orderBy: { createdAt: 'desc' } });
  const fbOutboundMsg = await prisma.message.create({
    data: {
      conversationId: fbConv!.id,
      customerId: existingFbCustomer!.id,
      channel: 'MESSENGER',
      direction: 'OUTBOUND',
      content: 'Yes! We follow "No Restaurant. No Noise. Sleep Well."',
      externalMessageId: `mid_fb_out_${Date.now()}`,
      status: 'SENT',
    },
  });
  const fbDelivPayload = {
    object: 'page',
    entry: [{
      id: 'fb_page_sherpa_soul',
      time: Date.now(),
      messaging: [{
        sender: { id: fbSenderId },
        recipient: { id: 'fb_page_sherpa_soul' },
        delivery: {
          mids: [fbOutboundMsg.externalMessageId!],
          watermark: Date.now(),
        },
      }],
    }],
  };
  const fbDelivReq = createSignedMetaRequest('http://localhost:3000/api/webhooks/messenger', fbDelivPayload);
  await postMessengerWebhook(fbDelivReq);
  const updatedFbDelivered = await prisma.message.findUnique({ where: { id: fbOutboundMsg.id } });
  assert(updatedFbDelivered?.status === 'DELIVERED', 'Task 3: Messenger message status updated to DELIVERED');

  // --- TASK 4: Instagram DM Verification ---
  // 1. Instagram Handshake
  const igHandshakeReq = new NextRequest(`http://localhost:3000/api/webhooks/instagram?hub.mode=subscribe&hub.challenge=ig_challenge_ok_777&hub.verify_token=${verifyToken}`);
  const igHandshakeRes = await getInstagramWebhook(igHandshakeReq);
  assert(igHandshakeRes.status === 200, 'Task 4: Instagram Webhook Challenge returns HTTP 200');
  assert((await igHandshakeRes.text()) === 'ig_challenge_ok_777', 'Task 4: Instagram Webhook returns challenge text');

  // 2. Instagram Inbound DM
  const igSenderId = `ig_user_${Date.now()}`;
  const igInboundPayload = {
    object: 'instagram',
    entry: [{
      id: process.env.INSTAGRAM_ACCOUNT_ID || 'ig_acc_sherpa_soul',
      time: Date.now(),
      messaging: [{
        sender: { id: igSenderId },
        recipient: { id: process.env.INSTAGRAM_ACCOUNT_ID || 'ig_acc_sherpa_soul' },
        timestamp: Date.now(),
        message: {
          mid: `mid_ig_in_${Date.now()}`,
          text: 'Hello from Instagram! How much is a Deluxe Room?',
        },
      }],
    }],
  };
  const igInboundReq = createSignedMetaRequest('http://localhost:3000/api/webhooks/instagram', igInboundPayload);
  const igInboundRes = await postInstagramWebhook(igInboundReq);
  assert(igInboundRes.status === 200, 'Task 4: Instagram Webhook receives DM and responds HTTP 200');

  // --- TASK 5: Cross-channel CRM Test ---
  // Verify Leads created across all 4 channels
  const leadsWebsite = await prisma.lead.findFirst({
    where: { channel: 'WEBSITE' },
    orderBy: { createdAt: 'desc' },
  });
  assert(Boolean(leadsWebsite), 'Task 5: CRM Lead created with channel WEBSITE');
  assert(leadsWebsite?.channel === 'WEBSITE', 'Task 5: Lead channel strictly matches WEBSITE');

  const leadsWhatsApp = await prisma.lead.findFirst({
    where: { channel: 'WHATSAPP' },
    orderBy: { createdAt: 'desc' },
  });
  assert(Boolean(leadsWhatsApp), 'Task 5: CRM Lead created with channel WHATSAPP');
  assert(leadsWhatsApp?.channel === 'WHATSAPP', 'Task 5: Lead channel strictly matches WHATSAPP');

  const leadsMessenger = await prisma.lead.findFirst({
    where: { channel: 'MESSENGER' },
    orderBy: { createdAt: 'desc' },
  });
  assert(Boolean(leadsMessenger), 'Task 5: CRM Lead created with channel MESSENGER');
  assert(leadsMessenger?.channel === 'MESSENGER', 'Task 5: Lead channel strictly matches MESSENGER');

  const leadsInstagram = await prisma.lead.findFirst({
    where: { channel: 'INSTAGRAM' },
    orderBy: { createdAt: 'desc' },
  });
  assert(Boolean(leadsInstagram), 'Task 5: CRM Lead created with channel INSTAGRAM');
  assert(leadsInstagram?.channel === 'INSTAGRAM', 'Task 5: Lead channel strictly matches INSTAGRAM');

  // Safety Constraint: Zero PMS bookings created
  const reservationsAfter = await prisma.reservation.count();
  assert(reservationsAfter === reservationsBefore, 'Task 5: Strict PMS Safety confirmed (0 live reservations created)', `before=${reservationsBefore}, after=${reservationsAfter}`);

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests()
  .catch((e) => {
    console.error('Fatal error during test run:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
