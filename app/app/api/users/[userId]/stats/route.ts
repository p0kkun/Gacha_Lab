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
    // 新方式: gacha_histories.rarity を優先
    const [rarityStatsByHistory, fallbackByItem] = await Promise.all([
      prisma.gachaHistory.groupBy({
        by: ['rarity'],
        where: { userId, rarity: { not: null } },
        _count: { id: true },
      }),
      prisma.gachaHistory.groupBy({
        by: ['itemId'],
        where: { userId, rarity: null },
        _count: { id: true },
      }),
    ]);

    const rarityStats: Record<string, number> = {};
    for (const stat of rarityStatsByHistory) {
      const key = stat.rarity || 'UNKNOWN';
      rarityStats[key] = (rarityStats[key] || 0) + stat._count.id;
    }

    // 旧データ（rarityがnull）のみ、アイテム側rarityで補完
    if (fallbackByItem.length > 0) {
      const itemIds = fallbackByItem.map((s) => s.itemId);
      const items = await prisma.gachaItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, rarity: true },
      });
      for (const stat of fallbackByItem) {
        const item = items.find((i) => i.id === stat.itemId);
        if (!item) continue;
        rarityStats[item.rarity] = (rarityStats[item.rarity] || 0) + stat._count.id;
      }
    }

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


