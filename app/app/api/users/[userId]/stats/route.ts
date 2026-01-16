import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { getCache, setCache } from "@/lib/cache";

/**
 * ユーザー統計情報を取得
 * GET /api/users/[userId]/stats
 *
 * フロー:
 * 1. バリデーション（400エラー、ログ不要）
 * 2. キャッシュ確認（オプション、未実装）
 * 3. ユーザー存在確認
 * 4. 統計情報取得（並列実行: Promise.all）
 * 5. キャッシュ更新（オプション、未実装）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;

    // Try①：バリデーション
    if (!userId || userId.trim() === "") {
      // バリデーションNG: 400エラー（ログ不要）
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    // Try②：キャッシュ確認（オプション）
    const cacheKey = `user-stats:${userId}`;
    const cachedStats = await getCache<{
      totalGachaCount: number;
      rarityStats: Record<string, number>;
    }>(cacheKey);

    if (cachedStats) {
      // キャッシュヒット
      return NextResponse.json(cachedStats);
    }

    // Try③：ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // Try④：統計情報取得（並列実行）
    const [totalGachaCount, rarityStatsByHistory] = await Promise.all([
      // ガチャ実行回数取得
      prisma.gachaHistory.count({
        where: { userId },
      }),
      // 等級別統計取得
      prisma.gachaHistory.groupBy({
        by: ["tierCode"],
        where: { userId, tierCode: { not: null } },
        _count: { id: true },
      }),
    ]);

    // 統計情報を集約
    const rarityStats: Record<string, number> = {};
    for (const stat of rarityStatsByHistory) {
      const key = stat.tierCode || "UNKNOWN";
      rarityStats[key] = (rarityStats[key] || 0) + stat._count.id;
    }

    // Try⑤：キャッシュ更新（TTL: 300秒）
    const stats = {
      totalGachaCount,
      rarityStats,
    };
    await setCache(cacheKey, stats, 300);

    return NextResponse.json(stats);
  } catch (error) {
    // Catch：例外処理
    console.error("ユーザー統計情報取得エラー:", error);
    console.error("エラー詳細:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    await logError(error, { route: "/api/users/[userId]/stats" }, request);
    return NextResponse.json(
      { 
        error: "統計情報の取得に失敗しました",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
