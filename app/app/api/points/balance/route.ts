import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * ユーザーのポイント残高を取得
 * GET /api/points/balance?userId=xxx
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

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { points: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      points: user.points,
    });
  } catch (error) {
    console.error('ポイント残高取得エラー:', error);
    return NextResponse.json(
      { error: 'ポイント残高の取得に失敗しました' },
      { status: 500 }
    );
  }
}

