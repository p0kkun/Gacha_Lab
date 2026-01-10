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

    // 等級別の集計（tierCode）
    const rarityStatsByHistory = await prisma.gachaHistory.groupBy({
      by: ['tierCode'],
      where: { userId, tierCode: { not: null } },
      _count: { id: true },
    });

    const rarityStats: Record<string, number> = {};
    for (const stat of rarityStatsByHistory) {
      const key = stat.tierCode || 'UNKNOWN';
      rarityStats[key] = (rarityStats[key] || 0) + stat._count.id;
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


