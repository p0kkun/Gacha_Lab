import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminAuthContext } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-action-history";
import { AdminActionType } from "@/lib/admin-action-types";
import { deleteCache } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache-keys";

/**
 * ポイント購入プラン更新（管理者用）
 * PUT /api/admin/point-plans/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true },
    });

    const { id } = await params;
    const planId = id;
    if (!planId || planId.trim() === "") {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const {
      points,
      bonusFreePoints,
      price,
      label,
      isActive,
      displayOrder,
    }: {
      points?: number;
      bonusFreePoints?: number;
      price?: number;
      label?: string;
      isActive?: boolean;
      displayOrder?: number;
    } = body;

    const adminUserId = adminUser?.id ?? authContext.adminUserId;
    const adminName = adminUser?.name ?? "unknown";

    const data: any = {};
    if (points !== undefined) {
      const pts = typeof points === "number" ? points : Number(points);
      if (!Number.isFinite(pts) || pts <= 0) {
        return NextResponse.json(
          { error: "ポイント数は1以上である必要があります" },
          { status: 400 }
        );
      }
      data.points = Math.trunc(pts);
    }
    if (bonusFreePoints !== undefined) {
      const bonus =
        typeof bonusFreePoints === "number"
          ? bonusFreePoints
          : Number(bonusFreePoints);
      if (!Number.isFinite(bonus) || bonus < 0) {
        return NextResponse.json(
          { error: "おまけ無償ポイントは0以上である必要があります" },
          { status: 400 }
        );
      }
      data.bonusFreePoints = Math.trunc(bonus);
    }
    if (price !== undefined) {
      const prc = typeof price === "number" ? price : Number(price);
      if (!Number.isFinite(prc) || prc <= 0) {
        return NextResponse.json(
          { error: "価格は1円以上である必要があります" },
          { status: 400 }
        );
      }
      data.price = Math.trunc(prc);
    }
    if (label !== undefined) {
      const lbl = typeof label === "string" ? label.trim() : "";
      if (!lbl) {
        return NextResponse.json(
          { error: "ラベルは必須です" },
          { status: 400 }
        );
      }
      data.label = lbl;
    }
    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }
    if (displayOrder !== undefined) {
      const ord =
        typeof displayOrder === "number" ? displayOrder : Number(displayOrder);
      if (!Number.isFinite(ord)) {
        return NextResponse.json(
          { error: "表示順が無効です" },
          { status: 400 }
        );
      }
      data.displayOrder = Math.trunc(ord);
    }

    // 更新前のデータを取得
    const oldPlan = await prisma.pointPurchasePlan.findUnique({
      where: { id: planId },
    });

    const updated = await prisma.pointPurchasePlan.update({
      where: { id: planId },
      data,
    });

    // 操作履歴を記録
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    Object.keys(data).forEach((key) => {
      if (oldPlan && (oldPlan as any)[key] !== data[key as keyof typeof data]) {
        changes[key] = {
          from: (oldPlan as any)[key],
          to: data[key as keyof typeof data],
        };
      }
    });

    await recordAdminAction({
      actionType: AdminActionType.POINT_PLAN_UPDATE,
      adminUserId: String(adminUserId),
      adminName,
      description: `ポイント購入プラン「${updated.label}」を更新（ID: ${planId}）`,
      metadata: {
        planId,
        changes,
      },
    });

    // キャッシュ削除（マスターデータ更新時）
    await deleteCache(CacheKeys.pointPurchasePlans());

    return NextResponse.json({ plan: updated });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "プランが見つかりません" },
        { status: 404 }
      );
    }
    console.error("管理者: 購入プラン更新エラー:", error);
    return NextResponse.json(
      { error: "購入プランの更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * ポイント購入プラン削除（管理者用）
 * DELETE /api/admin/point-plans/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true },
    });

    const { id } = await params;
    const planId = id;
    if (!planId || planId.trim() === "") {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    // 削除前のデータを取得
    const oldPlan = await prisma.pointPurchasePlan.findUnique({
      where: { id: planId },
    });

    const adminUserId = adminUser?.id ?? authContext.adminUserId;
    const adminName = adminUser?.name ?? "unknown";

    await prisma.pointPurchasePlan.delete({ where: { id: planId } });

    // 操作履歴を記録
    if (oldPlan) {
      await recordAdminAction({
        actionType: AdminActionType.POINT_PLAN_DELETE,
        adminUserId: String(adminUserId),
        adminName,
        description: `ポイント購入プラン「${oldPlan.label}」を削除（ID: ${planId}）`,
        metadata: {
          planId,
          plan: oldPlan,
        },
      });
    }

    // キャッシュ削除（マスターデータ削除時）
    await deleteCache(CacheKeys.pointPurchasePlans());

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "プランが見つかりません" },
        { status: 404 }
      );
    }
    console.error("管理者: 購入プラン削除エラー:", error);
    return NextResponse.json(
      { error: "購入プランの削除に失敗しました" },
      { status: 500 }
    );
  }
}


