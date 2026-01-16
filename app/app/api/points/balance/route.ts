import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPointBalances } from '@/lib/point-management';
import { logError } from '@/lib/error-logger';
import { getCache, setCache } from '@/lib/cache';

/**
 * ユーザーのポイント残高を取得
 * GET /api/points/balance?userId=xxx
 * 
 * フロー:
 * 1. バリデーション（400エラー、ログ不要）
 * 2. キャッシュ確認（オプション、未実装）
 * 3. DB処理（User + UserPointBalance取得、JOIN）
 * 4. 有効期限切れチェック（getPointBalances内で処理）
 * 5. キャッシュ更新（オプション、未実装）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Try①：バリデーション
    if (!userId || userId.trim() === '') {
      // バリデーションNG: 400エラー（ログ不要）
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Try②：キャッシュ確認（オプション）
    const cacheKey = `point-balance:${userId}`;
    const cachedBalance = await getCache<{
      paid: number;
      free: number;
      total: number;
      paidExpiresAt: string | null;
      freeExpiresAt: string | null;
      lastUpdated: string | null;
    }>(cacheKey);

    if (cachedBalance) {
      // キャッシュヒット
      return NextResponse.json({
        points: cachedBalance.total, // 後方互換性のため
        paid: cachedBalance.paid,
        free: cachedBalance.free,
        total: cachedBalance.total,
        paidExpiresAt: cachedBalance.paidExpiresAt,
        freeExpiresAt: cachedBalance.freeExpiresAt,
        lastUpdated: cachedBalance.lastUpdated,
      });
    }

    // Try③：DB処理（User + UserPointBalance取得、JOIN）
    // ユーザーとポイント残高を同時に取得（リレーションがないため、別々に取得）
    const [user, pointBalance] = await Promise.all([
      prisma.user.findUnique({
        where: { userId },
        select: { userId: true },
      }),
      prisma.userPointBalance.findUnique({
        where: { userId },
      }),
    ]);

    // ユーザー未登録
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // Try④：有効期限切れチェック（getPointBalances内で処理）
    // getPointBalancesは有効期限切れポイントの処理を含む
    const balances = await getPointBalances(userId);

    // Try⑤：キャッシュ更新（TTL: 60秒）
    await setCache(cacheKey, balances, 60);

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
    // Catch：例外処理
    console.error("ポイント残高取得エラー:", error);
    console.error("エラー詳細:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    await logError(error, { route: '/api/points/balance' }, request);
    return NextResponse.json(
      { 
        error: 'ポイント残高の取得に失敗しました',
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}





