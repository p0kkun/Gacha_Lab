import { NextRequest, NextResponse } from 'next/server';
import { getReferralCount, getReferralHistory } from '@/lib/referral-management';

/**
 * 紹介履歴取得API
 * GET /api/referral/history?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const count = await getReferralCount(userId);
    const history = await getReferralHistory(userId);

    return NextResponse.json({
      count,
      history: history.map((h) => ({
        id: h.id,
        refereeId: h.refereeId,
        referee: h.referee,
        completedAt: h.completedAt,
        refereeTotalSpent: h.refereeTotalSpent,
        refereeGachaCount: h.refereeGachaCount,
        refereeLastActiveAt: h.refereeLastActiveAt,
        additionalRewardGranted: h.additionalRewardGranted,
      })),
    });
  } catch (error) {
    console.error('紹介履歴取得エラー:', error);
    return NextResponse.json(
      { error: '紹介履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}

