import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

/**
 * 等級マスタ一覧取得
 * GET /api/admin/prize-tiers
 */
export async function GET(request: NextRequest) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tiers = await prisma.prizeTier.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("等級マスタ一覧取得エラー:", error);
    return NextResponse.json(
      { error: "等級マスタ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 等級マスタ作成
 * POST /api/admin/prize-tiers
 */
export async function POST(request: NextRequest) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const DISPLAY_ORDER_MIN = 0;
    const DISPLAY_ORDER_MAX = 9999;
    const body = await request.json();
    const { code, label, displayOrder, isActive } = body;

    if (!code || !label) {
      return NextResponse.json(
        { error: "等級コードと表示名は必須です" },
        { status: 400 }
      );
    }

    const normalizedDisplayOrder =
      displayOrder === undefined || displayOrder === null
        ? 0
        : Number(displayOrder);
    if (
      !Number.isInteger(normalizedDisplayOrder) ||
      normalizedDisplayOrder < DISPLAY_ORDER_MIN ||
      normalizedDisplayOrder > DISPLAY_ORDER_MAX
    ) {
      return NextResponse.json(
        {
          error: `表示順は${DISPLAY_ORDER_MIN}〜${DISPLAY_ORDER_MAX}の整数で入力してください`,
        },
        { status: 400 }
      );
    }

    // コードの重複チェック
    const existing = await prisma.prizeTier.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `等級コード "${code}" は既に使用されています` },
        { status: 400 }
      );
    }

    const tier = await prisma.prizeTier.create({
      data: {
        code,
        label,
        displayOrder: normalizedDisplayOrder,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ tier });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "等級コードが重複しています" },
        { status: 400 }
      );
    }
    console.error("等級マスタ作成エラー:", error);
    return NextResponse.json(
      { error: "等級マスタの作成に失敗しました" },
      { status: 500 }
    );
  }
}




