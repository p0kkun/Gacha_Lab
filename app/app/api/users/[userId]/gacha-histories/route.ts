import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      prisma.gachaHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          gachaTypeId: true,
          itemId: true,
          rarity: true,
          createdAt: true,
          pointsUsed: true,
          usedAt: true,
          gachaType: {
            select: { id: true, name: true },
          },
          item: {
            select: { id: true, name: true, rarity: true },
          },
        },
      }),
      prisma.gachaHistory.count({
        where: { userId },
      }),
    ]);

    const mapped = histories.map((h) => ({
      ...h,
      // 新方式: gacha_histories.rarity を優先（景品マスタ側のrarityに依存しない）
      item: {
        ...h.item,
        rarity: h.rarity ?? h.item?.rarity,
      },
    }));

    return NextResponse.json({
      histories: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('ガチャ履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'ガチャ履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}


