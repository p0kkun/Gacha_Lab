import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

/**
 * ポイント購入プラン更新（管理者用）
 * PUT /api/admin/point-plans/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const planId = id;
    if (!planId || planId.trim() === "") {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const {
      points,
      price,
      label,
      isActive,
      displayOrder,
    }: {
      points?: number;
      price?: number;
      label?: string;
      isActive?: boolean;
      displayOrder?: number;
    } = body;

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

    const updated = await prisma.pointPurchasePlan.update({
      where: { id: planId },
      data,
    });

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


