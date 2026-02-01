import { NextResponse } from "next/server";
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
    const cacheKey = CacheKeys.pointPurchasePlans();
    const cachedPlans = await getCache<Array<{
      id: string;
      points: number;
      bonusFreePoints: number;
      price: number;
      label: string;
      isActive: boolean;
      displayOrder: number;
    }>>(cacheKey);

    if (cachedPlans) {
      return NextResponse.json({ plans: cachedPlans });
    }

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
        { route: '/api/points/plans' }
      );
      return NextResponse.json(
        { error: "ポイント購入プランの取得に失敗しました" },
        { status: 500 }
      );
    }

    // データ検証：必須フィールドの存在確認
    const validatedPlans = plans.filter((plan) => {
      return (
        plan.id &&
        typeof plan.points === 'number' &&
        typeof plan.price === 'number' &&
        plan.label
      );
    });

    if (validatedPlans.length === 0 && plans.length > 0) {
      await logError(
        new Error('ポイント購入プランのデータ形式が不正です'),
        { route: '/api/points/plans', customData: { plansCount: plans.length } }
      );
      return NextResponse.json(
        { error: "ポイント購入プランのデータ形式が不正です" },
        { status: 500 }
      );
    }

    // Try③：キャッシュ更新（TTL: 86400秒 = 1日）
    // マスターデータは頻繁に更新されないため、1日キャッシュ
    // 管理ツールでの更新時にキャッシュ削除を行う
    await setCache(cacheKey, validatedPlans, 86400);

    return NextResponse.json({ plans: validatedPlans });
  } catch (error) {
    // Catch：例外処理
    await logError(error, { route: '/api/points/plans' });
    return NextResponse.json(
      { error: "ポイント購入プランの取得に失敗しました" },
      { status: 500 }
    );
  }
}
