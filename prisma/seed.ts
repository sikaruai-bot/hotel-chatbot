import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Hotel Sherpa Soul database...');

  // 1. Staff Account
  await prisma.staff.upsert({
    where: { email: 'admin@hotelsherpasoul.com' },
    update: {},
    create: {
      name: 'Sherpa Soul Front Desk',
      email: 'admin@hotelsherpasoul.com',
      role: 'ADMIN',
      passwordHash: 'admin123', // In production use bcrypt
      isActive: true,
    },
  });

  // 2. Room Types with starting dynamic prices (stored in DB, not hard-coded!)
  const deluxe = await prisma.roomType.upsert({
    where: { code: 'DELUXE' },
    update: { basePriceUsd: 20, maxAdults: 2, maxChildren: 1 },
    create: {
      code: 'DELUXE',
      name: 'Deluxe Room',
      description: 'Comfortable, quiet room with private bathroom, hot shower, high-speed Wi-Fi, and clean bedding for a restful sleep.',
      basePriceUsd: 20,
      maxAdults: 2,
      maxChildren: 1,
      isActive: true,
    },
  });

  const budgetFamily = await prisma.roomType.upsert({
    where: { code: 'BUDGET_FAMILY' },
    update: { basePriceUsd: 20, maxAdults: 3, maxChildren: 1 },
    create: {
      code: 'BUDGET_FAMILY',
      name: 'Budget Family Room',
      description: 'Clean and spacious value-oriented room suitable for small families or groups of 3 adults.',
      basePriceUsd: 20,
      maxAdults: 3,
      maxChildren: 1,
      isActive: true,
    },
  });

  const family = await prisma.roomType.upsert({
    where: { code: 'FAMILY' },
    update: { basePriceUsd: 30, maxAdults: 3, maxChildren: 1 },
    create: {
      code: 'FAMILY',
      name: 'Family Room',
      description: 'Larger family room offering optimal comfort, peaceful environment, and private bathroom amenities.',
      basePriceUsd: 30,
      maxAdults: 3,
      maxChildren: 1,
      isActive: true,
    },
  });

  // 3. Exact 6 Sellable Guest Rooms (Floors 2 & 3)
  // Second Floor
  await prisma.room.upsert({
    where: { roomNumber: '201' },
    update: { roomTypeId: deluxe.id, isSellable: true, isSharedKitchen: false },
    create: { roomNumber: '201', floor: 2, isSellable: true, isSharedKitchen: false, roomTypeId: deluxe.id, status: 'AVAILABLE' },
  });
  await prisma.room.upsert({
    where: { roomNumber: '202' },
    update: { roomTypeId: deluxe.id, isSellable: true, isSharedKitchen: false },
    create: { roomNumber: '202', floor: 2, isSellable: true, isSharedKitchen: false, roomTypeId: deluxe.id, status: 'AVAILABLE' },
  });
  await prisma.room.upsert({
    where: { roomNumber: '203' },
    update: { roomTypeId: budgetFamily.id, isSellable: true, isSharedKitchen: false },
    create: { roomNumber: '203', floor: 2, isSellable: true, isSharedKitchen: false, roomTypeId: budgetFamily.id, status: 'AVAILABLE' },
  });

  // Third Floor
  await prisma.room.upsert({
    where: { roomNumber: '301' },
    update: { roomTypeId: deluxe.id, isSellable: true, isSharedKitchen: false },
    create: { roomNumber: '301', floor: 3, isSellable: true, isSharedKitchen: false, roomTypeId: deluxe.id, status: 'AVAILABLE' },
  });
  await prisma.room.upsert({
    where: { roomNumber: '302' },
    update: { roomTypeId: budgetFamily.id, isSellable: true, isSharedKitchen: false },
    create: { roomNumber: '302', floor: 3, isSellable: true, isSharedKitchen: false, roomTypeId: budgetFamily.id, status: 'AVAILABLE' },
  });
  await prisma.room.upsert({
    where: { roomNumber: '303' },
    update: { roomTypeId: family.id, isSellable: true, isSharedKitchen: false },
    create: { roomNumber: '303', floor: 3, isSellable: true, isSharedKitchen: false, roomTypeId: family.id, status: 'AVAILABLE' },
  });

  // Room 102: Shared Kitchen (NOT a sellable room!)
  await prisma.room.upsert({
    where: { roomNumber: '102' },
    update: {
      isSellable: false,
      isSharedKitchen: true,
      notes: 'Shared kitchen facility for long-stay guests (minimum 2 weeks). Equipped with 2 mini fridges, 1 oven, 2 racks, 2 tables, 4 chairs, basin, wastewater management. NOT a restaurant or dining hall.',
    },
    create: {
      roomNumber: '102',
      floor: 1,
      isSellable: false,
      isSharedKitchen: true,
      status: 'AVAILABLE',
      notes: 'Shared kitchen facility for long-stay guests (minimum 2 weeks). Equipped with 2 mini fridges, 1 oven, 2 racks, 2 tables, 4 chairs, basin, wastewater management. NOT a restaurant or dining hall.',
    },
  });

  // 4. Knowledge Base Entries (Strict Anti-Hallucination Source of Truth)
  const kbEntries = [
    {
      category: 'HOTEL_INFO',
      topic: 'Hotel Overview & Positioning',
      question: 'Tell me about Hotel Sherpa Soul',
      answer: 'Hotel Sherpa Soul is a clean, comfortable, and peaceful budget hotel located at 26 Thamel Bhagwati Marg, Kathmandu, Nepal. Our philosophy is "No Restaurant. No Noise. Sleep Well." We focus on providing travelers with restful sleep, clean rooms, reliable hot water, high-speed Wi-Fi, and warm Nepali hospitality in the heart of Thamel.',
      keywords: 'about,hotel,overview,who are you,sherpa soul,positioning',
      priority: 10,
    },
    {
      category: 'FACILITIES',
      topic: 'Restaurant & Food Policy',
      question: 'Do you have a restaurant or breakfast dining hall?',
      answer: 'No, Hotel Sherpa Soul does not have a restaurant or dining hall ("No Restaurant. No Noise. Sleep Well."). This ensures our rooms remain peaceful and quiet with no kitchen odors or late-night noise. However, we are in the center of Thamel, surrounded by dozens of excellent bakeries, cafes, and restaurants just a 1 to 2 minute walk away.',
      keywords: 'restaurant,food,breakfast,dining,dinner,lunch,cafe,eat,meal',
      priority: 10,
    },
    {
      category: 'FACILITIES',
      topic: 'Parking Policy',
      question: 'Do you have private parking?',
      answer: 'No, we do not have private parking on-site. Thamel is a designated pedestrian-priority area. Public paid parking lots are available within a short walking distance outside the main pedestrian alleys.',
      keywords: 'parking,car,bike,garage,vehicle',
      priority: 10,
    },
    {
      category: 'FACILITIES',
      topic: 'Luxury Amenities (Pool, Gym)',
      question: 'Do you have a swimming pool or gym?',
      answer: 'No, we do not have a swimming pool, gym, spa, or luxury resort facilities. We are a clean, dedicated peaceful budget hotel designed for travelers looking for great sleep and central convenience.',
      keywords: 'pool,swimming,gym,fitness,spa,massage',
      priority: 10,
    },
    {
      category: 'SHARED_KITCHEN',
      topic: 'Room 102 Shared Kitchen for Long Stay',
      question: 'Can I cook or use a kitchen?',
      answer: 'We have Room 102 which is a shared kitchen facility available exclusively for long-stay guests staying for at least 2 weeks (14 nights). It is equipped with 2 mini fridges, 1 oven, 2 storage racks, 2 dining tables, 4 chairs, wash basin, and wastewater management. Please note this is for self-cooking for long-stay guests, not a restaurant or dining room.',
      keywords: 'kitchen,cook,cooking,room 102,shared kitchen,stove,fridge,long stay',
      priority: 9,
    },
    {
      category: 'LOCATION',
      topic: 'Address & Directions',
      question: 'Where is Hotel Sherpa Soul located?',
      answer: 'We are located at 26 Thamel Bhagwati Marg, Thamel, Kathmandu 44600, Nepal. We are in a quiet side street in central Thamel, walking distance to Garden of Dreams (7 mins), Kathmandu Durbar Square (20 mins), and surrounded by trekking shops and currency exchanges.',
      keywords: 'location,address,where,map,thamel,find,direction',
      priority: 9,
    },
    {
      category: 'CHECKIN_OUT',
      topic: 'Check-in and Check-out Times',
      question: 'What are your check-in and check-out times?',
      answer: 'Standard check-in is from 12:00 PM (noon), and check-out is by 11:00 AM. Early check-in or late check-out is subject to room availability on the day and should be coordinated with our front desk.',
      keywords: 'check in,check out,checkin,checkout,early checkin,late checkout,timing',
      priority: 8,
    },
    {
      category: 'TRANSPORT',
      topic: 'Airport Pickup & Transportation',
      question: 'Do you provide airport pickup?',
      answer: 'We can assist in arranging a private taxi pickup from Tribhuvan International Airport (approx 6 km away). Since airport taxi fares are determined by standard driver rates, our front desk will confirm the exact price and vehicle details directly with you.',
      keywords: 'airport,pickup,transfer,taxi,flight,shuttle,transport',
      priority: 8,
    },
    {
      category: 'POLICIES',
      topic: 'Quiet Hours Policy',
      question: 'What is your noise policy?',
      answer: 'To ensure every guest gets restful sleep, we observe strict quiet hours from 10:00 PM to 7:00 AM. Parties and loud music are strictly prohibited.',
      keywords: 'quiet,noise,sound,sleep,party,rules',
      priority: 8,
    },
    {
      category: 'PRICING',
      topic: 'Room Rates',
      question: 'How much are your rooms?',
      answer: 'Our current starting rates are:\n• Deluxe Room — USD 20/night (up to 2 adults + 1 child)\n• Budget Family Room — USD 20/night (up to 3 adults + 1 child)\n• Family Room — USD 30/night (up to 3 adults + 1 child)\nRates include high-speed Wi-Fi and hot shower. Taxes may apply. If you share your travel dates and number of guests, we can check availability!',
      keywords: 'price,rate,cost,how much,tariff,cheap,discount',
      priority: 9,
    },
    {
      category: 'FAQ',
      topic: 'Wi-Fi and Hot Water',
      question: 'Is there fast Wi-Fi and 24/7 hot water?',
      answer: 'Yes! We provide reliable high-speed fiber Wi-Fi throughout all rooms and 24-hour solar & backup hot water showers.',
      keywords: 'wifi,internet,hot water,shower,speed',
      priority: 7,
    },
  ];

  for (const entry of kbEntries) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { topic: entry.topic },
    });
    if (existing) {
      await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: entry,
      });
    } else {
      await prisma.knowledgeBase.create({ data: entry });
    }
  }

  // 5. Hotel Settings
  const settings = [
    { key: 'hotel_name', value: 'Hotel Sherpa Soul', category: 'GENERAL', description: 'Official hotel name' },
    { key: 'hotel_tagline', value: 'No Restaurant. No Noise. Sleep Well.', category: 'GENERAL', description: 'Hotel brand tagline' },
    { key: 'hotel_address', value: '26 Thamel Bhagwati Marg, Kathmandu 44600, Nepal', category: 'GENERAL', description: 'Physical address' },
    { key: 'hotel_phone', value: '+977-1-4530311', category: 'CONTACT', description: 'Front desk landline phone' },
    { key: 'hotel_whatsapp', value: '+977-9851068219', category: 'CONTACT', description: 'Official WhatsApp support number' },
    { key: 'hotel_email', value: 'info@hotelsherpasoul.com', category: 'CONTACT', description: 'Front desk email' },
    { key: 'booking_direct_url', value: 'https://www.hotelsherpasoul.com', category: 'LINKS', description: 'Direct booking website' },
    { key: 'whatsapp_direct_url', value: 'https://wa.me/9779851068219', category: 'LINKS', description: 'Direct WhatsApp link' },
    { key: 'booking_com_url', value: 'https://www.booking.com', category: 'LINKS', description: 'Booking.com listing' },
    { key: 'agoda_url', value: 'https://www.agoda.com', category: 'LINKS', description: 'Agoda listing' },
    { key: 'bot_greeting_en', value: 'Hi! Welcome to Hotel Sherpa Soul 😊 How can I help you today?', category: 'CHATBOT', description: 'Default English greeting' },
    { key: 'bot_greeting_ne', value: 'नमस्ते! होटल शेर्पा सोलमा यहाँलाई स्वागत छ 😊 आज म यहाँलाई कसरी सहयोग गर्न सक्छु?', category: 'CHATBOT', description: 'Default Nepali greeting' },
    { key: 'bot_greeting_hi', value: 'नमस्ते! होटल शेरपा सोल में आपका स्वागत है 😊 आज मैं आपकी क्या सहायता कर सकता हूँ?', category: 'CHATBOT', description: 'Default Hindi greeting' },
  ];

  for (const s of settings) {
    await prisma.hotelSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, category: s.category, description: s.description },
      create: s,
    });
  }

  // 6. Create sample customer and inquiry for staff dashboard demo
  const demoCustomer = await prisma.customer.upsert({
    where: { phone: '+9779812345678' },
    update: {},
    create: {
      name: 'Tashi Namgyal',
      phone: '+9779812345678',
      email: 'tashi@example.com',
      whatsappId: '+9779812345678',
      firstChannel: 'WHATSAPP',
    },
  });

  const demoConv = await prisma.conversation.create({
    data: {
      customerId: demoCustomer.id,
      channel: 'WHATSAPP',
      status: 'HIGH_INTENT',
      mode: 'BOT',
      language: 'en',
      summary: 'Guest requested Deluxe Room for 2 adults. Dates: Oct 12 - Oct 15. Awaiting front desk confirmation.',
      state: {
        create: {
          guestName: 'Tashi Namgyal',
          checkIn: '12 Oct 2026',
          checkOut: '15 Oct 2026',
          adults: 2,
          children: 0,
          roomType: 'Deluxe Room',
          roomsCount: 1,
          currentStep: 'CONFIRMING_SUMMARY',
          lastIntent: 'BOOKING',
          intentConfidence: 0.98,
        },
      },
      messages: {
        create: [
          {
            direction: 'INBOUND',
            channel: 'WHATSAPP',
            messageType: 'TEXT',
            content: 'Hi, I need a quiet room in Thamel for 2 people from 12 to 15 October.',
          },
          {
            direction: 'OUTBOUND',
            channel: 'WHATSAPP',
            messageType: 'TEXT',
            content: 'Hi Tashi! Welcome to Hotel Sherpa Soul 😊 For 2 adults from 12 to 15 October, our Deluxe Room is ideal at USD 20/night, subject to availability. Would you like me to send this booking request to our front desk?',
          },
          {
            direction: 'INBOUND',
            channel: 'WHATSAPP',
            messageType: 'TEXT',
            content: 'Yes please, I want to book it!',
          },
        ],
      },
    },
  });

  await prisma.lead.create({
    data: {
      customerId: demoCustomer.id,
      name: 'Tashi Namgyal',
      phone: '+9779812345678',
      email: 'tashi@example.com',
      channel: 'WHATSAPP',
      source: 'Meta Click-to-WhatsApp Ad',
      campaign: 'Kathmandu_Autumn_Trek_2026',
      leadStatus: 'HIGH_INTENT',
      conversationStatus: 'HIGH_INTENT',
      checkIn: '12 Oct 2026',
      checkOut: '15 Oct 2026',
      adults: 2,
      children: 0,
      roomType: 'Deluxe Room',
      estimatedValue: 60,
      scoreReason: 'HIGH — Guest provided dates + guest count + asked to book.',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
