import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;

    // ガチャ実行回数
    const totalGachaCount = await prisma.gachaHistory.count({
      where: { userId },
    });

    // レアリティ別の集計
    const rarityStatsRaw = await prisma.gachaHistory.groupBy({
      by: ['itemId'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // アイテム情報を取得してレアリティ別に集計
    const itemIds = rarityStatsRaw.map((stat) => stat.itemId);
    const items = await prisma.gachaItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, rarity: true },
    });

    const rarityStats: Record<string, number> = {};
    rarityStatsRaw.forEach((stat) => {
      const item = items.find((i) => i.id === stat.itemId);
      if (item) {
        rarityStats[item.rarity] = (rarityStats[item.rarity] || 0) + stat._count.id;
      }
    });

    return NextResponse.json({
      totalGachaCount,
      rarityStats,
    });
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}


