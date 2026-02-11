import { NextRequest, NextResponse } from 'next/server';
import { getReferralCount, getReferralHistory } from '@/lib/referral-management';
import { logError } from '@/lib/error-logger';

/**
 * 紹介履歴取得API
 * GET /api/referral/history?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const count = await getReferralCount(userId);
    const { items, totalCount } = await getReferralHistory(userId, page, limit);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json({
      count,
      history: items.map((h) => ({
        id: h.id,
        refereeId: h.toUserId,
        referee: h.toUser,
        completedAt: h.completedAt,
        refereeLastActiveAt: null, // UserActivityモデルにlastActiveAtフィールドは存在しない
        additionalRewardGranted: !!h.additionalReward,
        additionalReward: h.additionalReward
          ? {
              points: h.additionalReward.points,
              description: h.additionalReward.description,
              grantedAt: h.additionalReward.grantedAt,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    await logError(error, { route: '/api/referral/history' }, request);
    return NextResponse.json(
      { error: '紹介履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}




