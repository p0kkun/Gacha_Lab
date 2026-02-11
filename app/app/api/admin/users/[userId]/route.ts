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
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ガチャ履歴を取得（リレーションを使わずIDベースで取得）
    const rawGachaHistories = await prisma.gachaHistory.findMany({
      where: { userId },
      take: 50, // 最新50件
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        gachaTypeId: true,
        itemId: true,
        tierCode: true,
        createdAt: true,
        pointsUsed: true,
      },
    });

    const gachaTypeIds = [...new Set(rawGachaHistories.map((h) => h.gachaTypeId))];
    const itemIds = [...new Set(rawGachaHistories.filter((h) => h.itemId !== null).map((h) => h.itemId as number))];

    const [gachaTypes, items] = await Promise.all([
      prisma.gachaType.findMany({
        where: { id: { in: gachaTypeIds } },
        select: { id: true, name: true },
      }),
      prisma.gachaItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, name: true },
      }),
    ]);

    const gachaTypeMap = new Map(gachaTypes.map((gt) => [gt.id, gt]));
    const itemMap = new Map(items.map((it) => [it.id, it]));

    const gachaHistories = rawGachaHistories.map((h) => ({
      ...h,
      gachaType: gachaTypeMap.get(h.gachaTypeId) ?? null,
      item: h.itemId ? itemMap.get(h.itemId) ?? null : null,
    }));

    // カウントを取得
    const [gachaHistoriesCount, referralUsersAsReferrerCount, referralUsersAsRefereeCount] = await Promise.all([
      prisma.gachaHistory.count({ where: { userId } }),
      prisma.referralUser.count({ where: { userId } }),
      prisma.referralUser.count({ where: { toUserId: userId } }),
    ]);

    // 等級別の集計（tierCode）
    const rarityStatsByHistory = await prisma.gachaHistory.groupBy({
      by: ['tierCode'],
      where: { userId, tierCode: { not: null } },
      _count: { id: true },
    });

    const rarityCounts: Record<string, number> = {};
    for (const stat of rarityStatsByHistory) {
      const key = (stat as any).tierCode || 'UNKNOWN';
      rarityCounts[key] = (rarityCounts[key] || 0) + stat._count.id;
    }

    return NextResponse.json({
      user: {
        userId: user.userId,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        counts: {
          gachaHistories: gachaHistoriesCount,
          referralUsersAsReferrer: referralUsersAsReferrerCount,
          referralUsersAsReferee: referralUsersAsRefereeCount,
          freeGachaHistories: 0, // FreeGachaHistoryは削除されたため0
        },
        rarityStats: rarityCounts,
      },
      gachaHistories,
    });
  } catch (error) {
    console.error('ユーザー詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}


