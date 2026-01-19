import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { getCache, setCache } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache-keys";

/**
 * 購入可能なポイントプラン一覧（公開）
 * GET /api/points/plans
 * 
 * フロー:
 * 1. キャッシュ確認（優先、オプション、未実装）
 * 2. DB取得
 * 3. キャッシュ更新（オプション、未実装）
 */
export async function GET() {
  try {
    // Try①：キャッシュ確認（優先）
    // TODO: キャッシュレイヤー実装時に追加
    // if (キャッシュヒット) {
    //   return NextResponse.json({ plans: キャッシュデータ });
    // }

    // Try②：DB取得
    const plans = await prisma.pointPurchasePlan.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        points: true,
        bonusFreePoints: true,
        price: true,
        label: true,
        isActive: true,
        displayOrder: true,
      },
    });

    // データ取得失敗チェック（通常は例外が発生するが、念のため）
    if (!plans) {
      await logError(
        new Error('ポイント購入プランの取得に失敗しました'),
        { route: '/api/points/plans' },
        null as unknown as NextRequest
      );
      return NextResponse.json(
        { error: "ポイント購入プランの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Try③：キャッシュ更新（TTL: 86400秒 = 1日）
    // マスターデータは頻繁に更新されないため、1日キャッシュ
    // 管理ツールでの更新時にキャッシュ削除を行う
    const cacheKey = CacheKeys.pointPurchasePlans();
    await setCache(cacheKey, plans, 86400);

    return NextResponse.json({ plans });
  } catch (error) {
    // Catch：例外処理
    await logError(error, { route: '/api/points/plans' }, null as unknown as NextRequest);
    return NextResponse.json(
      { error: "ポイント購入プランの取得に失敗しました" },
      { status: 500 }
    );
  }
}
