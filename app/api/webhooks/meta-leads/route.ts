import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookChallenge, verifyMetaSignature } from '@/lib/meta/verification';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/meta/whatsapp';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const result = verifyWebhookChallenge(mode, token, challenge);
  if (result.isValid && result.challenge) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!verifyMetaSignature(rawBody, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const data = JSON.parse(rawBody);

    // Meta Leadgen Webhook structure
    if (data.entry) {
      for (const entry of data.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value?.leadgen_id;
            const adId = change.value?.ad_id;
            const formId = change.value?.form_id;

            // Direct mock payload support for testing
            const testData = change.value?.mockData;
            const leadName = testData?.name || 'Meta Ad Lead';
            const leadPhone = testData?.phone || '+9779800000000';
            const leadEmail = testData?.email || 'lead@example.com';
            const campaign = testData?.campaign || 'Meta_Thamel_Travelers_Campaign';

            // Find or create customer
            let customer = await prisma.customer.findFirst({
              where: { OR: [{ phone: leadPhone }, { email: leadEmail }] },
            });

            if (!customer) {
              customer = await prisma.customer.create({
                data: {
                  name: leadName,
                  phone: leadPhone,
                  email: leadEmail,
                  whatsappId: leadPhone,
                  firstChannel: 'META_LEAD_ADS',
                },
              });
            }

            // Create or update Lead record
            await prisma.lead.create({
              data: {
                customerId: customer.id,
                name: leadName,
                phone: leadPhone,
                email: leadEmail,
                channel: 'META_LEAD_ADS',
                source: 'Meta Lead Ads',
                campaign,
                adId: adId ? String(adId) : undefined,
                leadStatus: 'NEW',
                conversationStatus: 'NEW',
                scoreReason: 'NEW lead captured via Meta Lead Ad',
              },
            });

            // Automated First Lead Message (Section 19)
            const firstMsg = `Hi ${leadName}, thanks for contacting Hotel Sherpa Soul 😊\nAre you looking for a room in Thamel, Kathmandu?\nI can help you with:\n• Room prices\n• Availability\n• Booking information\nWhat are your travel dates?`;

            // Start conversation record
            const conversation = await prisma.conversation.create({
              data: {
                customerId: customer.id,
                channel: 'WHATSAPP',
                status: 'NEW',
                mode: 'BOT',
                messages: {
                  create: {
                    direction: 'OUTBOUND',
                    channel: 'WHATSAPP',
                    messageType: 'TEXT',
                    content: firstMsg,
                  },
                },
              },
            });

            // Dispatch to WhatsApp
            if (leadPhone) {
              await sendWhatsAppMessage({
                to: leadPhone,
                text: firstMsg,
                buttons: ['Check Availability', 'Room Prices', 'Hotel Info'],
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'LEAD_PROCESSED' }, { status: 200 });
  } catch (error) {
    console.error('Meta Lead Webhook Error:', error);
    return NextResponse.json({ error: 'Failed to process lead' }, { status: 500 });
  }
}
