import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCache, deleteCache, deleteCachePattern } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache-keys";

/**
 * キャッシュ一覧取得（管理者用）
 * GET /api/admin/cache
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const pattern = searchParams.get("pattern");

    if (key) {
      // 特定のキーの値を取得
      const value = await getCache(key);
      return NextResponse.json({
        key,
        value,
        exists: value !== null,
      });
    }

    if (pattern) {
      // パターンに一致するキーを検索（実装は簡易版）
      // 実際の実装では、RedisのKEYSコマンドやSCANを使用する必要がある
      return NextResponse.json({
        message: "パターン検索は今後実装予定",
        pattern,
      });
    }

    // 定義されているキャッシュキーの一覧を返す
    return NextResponse.json({
      cacheKeys: {
        pointBalance: CacheKeys.pointBalance("{userId}"),
        pointBalancePattern: CacheKeys.pointBalancePattern(),
        userStatsGacha: CacheKeys.userStatsGacha("{userId}"),
        userStatsItems: CacheKeys.userStatsItems("{userId}"),
        userStatsPattern: CacheKeys.userStatsPattern(),
        pointPurchasePlans: CacheKeys.pointPurchasePlans(),
        allPattern: CacheKeys.allPattern(),
      },
    });
  } catch (error) {
    console.error("管理者: キャッシュ取得エラー:", error);
    return NextResponse.json(
      { error: "キャッシュの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * キャッシュ削除（管理者用）
 * DELETE /api/admin/cache
 */
export async function DELETE(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, pattern, type } = body as {
      key?: string;
      pattern?: string;
      type?: "key" | "pattern" | "all";
    };

    if (type === "all") {
      // 全削除（注意して使用）
      await deleteCachePattern(CacheKeys.allPattern());
      return NextResponse.json({
        success: true,
        message: "全てのキャッシュを削除しました",
      });
    }

    if (pattern) {
      // パターン削除
      await deleteCachePattern(pattern);
      return NextResponse.json({
        success: true,
        message: `パターン「${pattern}」に一致するキャッシュを削除しました`,
        pattern,
      });
    }

    if (key) {
      // 単一キー削除
      await deleteCache(key);
      return NextResponse.json({
        success: true,
        message: `キー「${key}」のキャッシュを削除しました`,
        key,
      });
    }

    return NextResponse.json(
      { error: "key、pattern、またはtypeが必要です" },
      { status: 400 }
    );
  } catch (error) {
    console.error("管理者: キャッシュ削除エラー:", error);
    return NextResponse.json(
      { error: "キャッシュの削除に失敗しました" },
      { status: 500 }
    );
  }
}
