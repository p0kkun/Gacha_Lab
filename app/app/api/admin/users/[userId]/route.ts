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

    // ガチャ履歴を取得
    const gachaHistories = await prisma.gachaHistory.findMany({
      where: { userId },
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
          },
        },
      },
    });

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


