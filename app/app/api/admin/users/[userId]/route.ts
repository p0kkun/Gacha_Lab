import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ユーザー詳細を取得
 * GET /api/admin/users/[userId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;

    // ユーザー情報とガチャ履歴を取得
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        gachaHistories: {
          take: 50, // 最新50件
          orderBy: { createdAt: 'desc' },
          include: {
            gachaType: {
              select: {
                id: true,
                name: true,
              },
            },
            item: {
              select: {
                id: true,
                name: true,
                rarity: true,
              },
            },
          },
        },
        _count: {
          select: {
            gachaHistories: true,
            referralHistoriesAsReferrer: true,
            referralHistoriesAsReferee: true,
            freeGachaHistories: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // レアリティ別の集計
    const rarityStats = await prisma.gachaHistory.groupBy({
      by: ['itemId'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // アイテム情報を取得してレアリティ別に集計
    const itemIds = rarityStats.map((stat) => stat.itemId);
    const items = await prisma.gachaItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, rarity: true },
    });

    const rarityCounts: Record<string, number> = {};
    rarityStats.forEach((stat) => {
      const item = items.find((i) => i.id === stat.itemId);
      if (item) {
        rarityCounts[item.rarity] = (rarityCounts[item.rarity] || 0) + stat._count.id;
      }
    });

    return NextResponse.json({
      user: {
        userId: user.userId,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        counts: user._count,
        rarityStats: rarityCounts,
      },
      gachaHistories: user.gachaHistories,
    });
  } catch (error) {
    console.error('ユーザー詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}


