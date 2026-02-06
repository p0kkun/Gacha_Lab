import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminAuthContext } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-action-history";
import { AdminActionType } from "@/lib/admin-action-types";
import { deleteCache } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache-keys";

function isValidPlanId(id: string): boolean {
  // URL/メタデータにも載るため、シンプルな文字種に限定
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * ポイント購入プラン一覧（管理者用）
 * GET /api/admin/point-plans
 */
export async function GET(request: NextRequest) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plans = await prisma.pointPurchasePlan.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("管理者: 購入プラン一覧取得エラー:", error);
    return NextResponse.json(
      { error: "購入プラン一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * ポイント購入プラン作成（管理者用）
 * POST /api/admin/point-plans
 */
export async function POST(request: NextRequest) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true },
    });

    const body = await request.json();
    const {
      id,
      points,
      bonusFreePoints,
      price,
      label,
      isActive,
      displayOrder,
    }: {
      id?: string;
      points?: number;
      bonusFreePoints?: number;
      price?: number;
      label?: string;
      isActive?: boolean;
      displayOrder?: number;
    } = body;

    const normalizedId =
      typeof id === "string" && id.trim() !== "" ? id.trim() : null;
    if (!normalizedId) {
      return NextResponse.json(
        { error: "プランIDは必須です" },
        { status: 400 }
      );
    }
    if (!isValidPlanId(normalizedId)) {
      return NextResponse.json(
        { error: "プランIDは英数字/ハイフン/アンダースコアのみ使用できます" },
        { status: 400 }
      );
    }

    const pts = typeof points === "number" ? points : Number(points);
    const bonus =
      typeof bonusFreePoints === "number"
        ? bonusFreePoints
        : bonusFreePoints === undefined
          ? 0
          : Number(bonusFreePoints);
    const prc = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(pts) || pts <= 0) {
      return NextResponse.json(
        { error: "ポイント数は1以上である必要があります" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(bonus) || bonus < 0) {
      return NextResponse.json(
        { error: "おまけ無償ポイントは0以上である必要があります" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(prc) || prc <= 0) {
      return NextResponse.json(
        { error: "価格は1円以上である必要があります" },
        { status: 400 }
      );
    }

    const lbl = typeof label === "string" ? label.trim() : "";
    if (!lbl) {
      return NextResponse.json({ error: "ラベルは必須です" }, { status: 400 });
    }

    const created = await prisma.pointPurchasePlan.create({
      data: {
        id: normalizedId,
        points: Math.trunc(pts),
        bonusFreePoints: Math.trunc(bonus),
        price: Math.trunc(prc),
        label: lbl,
        isActive: typeof isActive === "boolean" ? isActive : true,
        displayOrder:
          typeof displayOrder === "number" && Number.isFinite(displayOrder)
            ? Math.trunc(displayOrder)
            : 0,
      },
    });

    const adminUserId = adminUser?.id ?? authContext.adminUserId;
    const adminName = adminUser?.name ?? 'unknown';

    // 操作履歴を記録
    await recordAdminAction({
      actionType: AdminActionType.POINT_PLAN_CREATE,
      adminUserId: String(adminUserId),
      adminName,
      description: `ポイント購入プラン「${lbl}」を作成（ID: ${normalizedId}, ${Math.trunc(pts)}ポイント, ${Math.trunc(prc)}円）`,
      metadata: {
        planId: normalizedId,
        points: Math.trunc(pts),
        bonusFreePoints: Math.trunc(bonus),
        price: Math.trunc(prc),
        label: lbl,
        isActive: typeof isActive === "boolean" ? isActive : true,
        displayOrder: typeof displayOrder === "number" && Number.isFinite(displayOrder)
          ? Math.trunc(displayOrder)
          : 0,
      },
    });

    // キャッシュ削除（マスターデータ作成時）
    await deleteCache(CacheKeys.pointPurchasePlans());

    return NextResponse.json({ plan: created });
  } catch (error: any) {
    // Prisma unique constraint
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "同じプランIDが既に存在します" },
        { status: 400 }
      );
    }
    console.error("管理者: 購入プラン作成エラー:", error);
    return NextResponse.json(
      { error: "購入プランの作成に失敗しました" },
      { status: 500 }
    );
  }
}


