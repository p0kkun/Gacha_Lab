import { NextRequest, NextResponse } from 'next/server';
import { generateReferralLink } from '@/lib/referral-management';

/**
 * 紹介リンク生成API
 * POST /api/referral/generate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const result = await generateReferralLink(userId);

    return NextResponse.json({
      success: true,
      referralLinkId: result.referralLinkId,
      referralLink: result.referralLink,
    });
  } catch (error) {
    console.error('紹介リンク生成エラー:', error);
    return NextResponse.json(
      { error: '紹介リンクの生成に失敗しました' },
      { status: 500 }
    );
  }
}








