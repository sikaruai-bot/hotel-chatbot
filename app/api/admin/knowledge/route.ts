import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const kb = await prisma.knowledgeBase.findMany({
      orderBy: [{ category: 'asc' }, { priority: 'desc' }],
    });
    const settings = await prisma.hotelSetting.findMany({
      orderBy: { category: 'asc' },
    });
    return NextResponse.json({ kb, settings });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, item, setting } = body;

    // 1. Update/Create Knowledge Base Item
    if (action === 'save_kb' && item) {
      if (item.id) {
        const updated = await prisma.knowledgeBase.update({
          where: { id: item.id },
          data: {
            category: item.category,
            topic: item.topic,
            question: item.question,
            answer: item.answer,
            keywords: item.keywords,
            isActive: item.isActive ?? true,
          },
        });
        return NextResponse.json({ success: true, item: updated });
      } else {
        const created = await prisma.knowledgeBase.create({
          data: {
            category: item.category,
            topic: item.topic,
            question: item.question,
            answer: item.answer,
            keywords: item.keywords,
            isActive: true,
          },
        });
        return NextResponse.json({ success: true, item: created });
      }
    }

    // 2. Delete KB item
    if (action === 'delete_kb' && item?.id) {
      await prisma.knowledgeBase.delete({ where: { id: item.id } });
      return NextResponse.json({ success: true });
    }

    // 3. Update Hotel Setting
    if (action === 'update_setting' && setting) {
      const updated = await prisma.hotelSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category || 'GENERAL',
          description: setting.description,
        },
      });
      return NextResponse.json({ success: true, setting: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
