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
              },
            },
          },
        },
        _count: {
          select: {
            gachaHistories: true,
            referralUsersAsReferrer: true,
            referralUsersAsReferee: true,
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


