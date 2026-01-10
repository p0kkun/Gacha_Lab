import { NextRequest, NextResponse } from 'next/server';
import { verifyReferralLink } from '@/lib/referral-management';

/**
 * 紹介リンク検証API
 * POST /api/referral/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralLinkId, userId } = body;

    if (!referralLinkId) {
      return NextResponse.json(
        { error: '紹介リンクIDが必要です' },
        { status: 400 }
      );
    }

    // IPアドレスを取得
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    // デバイス情報を取得
    const deviceInfo = request.headers.get('user-agent') || 'unknown';

    // userIdが指定されている場合、User.lastAccessedReferralLinkIdに記録
    const result = await verifyReferralLink(referralLinkId, ipAddress, deviceInfo, userId);

    if (!result.isValid) {
      return NextResponse.json(
        {
          isValid: false,
          reason: result.reason,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      isValid: true,
      referralId: result.referralId,
    });
  } catch (error) {
    console.error('紹介リンク検証エラー:', error);
    return NextResponse.json(
      { error: '紹介リンクの検証に失敗しました' },
      { status: 500 }
    );
  }
}






