import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPointBalances } from '@/lib/point-management';
import { logError } from '@/lib/error-logger';

/**
 * ユーザーのポイント残高を取得
 * GET /api/points/balance?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      await logError(
        new Error('ユーザーIDが必要です'),
        { route: '/api/points/balance' },
        request
      );
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーが存在するか確認
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ポイント残高を取得（有償/無償分離、有効期限考慮）
    const balances = await getPointBalances(userId);

    return NextResponse.json({
      points: balances.total, // 後方互換性のため
      paid: balances.paid,
      free: balances.free,
      total: balances.total,
      paidExpiresAt: balances.paidExpiresAt,
      freeExpiresAt: balances.freeExpiresAt,
      lastUpdated: balances.lastUpdated,
    });
  } catch (error) {
    await logError(error, { route: '/api/points/balance' }, request);
    return NextResponse.json(
      { error: 'ポイント残高の取得に失敗しました' },
      { status: 500 }
    );
  }
}





