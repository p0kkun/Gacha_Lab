import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

type CreateBody = {
  gachaTypeId?: string; // 外部からは code を受け取る（互換のためキー名は維持）
  tierCode?: string;
  itemId?: number;
  weight?: number;
  isActive?: boolean;
};

/**
 * 景品割当一覧（管理者用）
 * GET /api/admin/prize-assignments?gachaTypeId=xxx
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gachaTypeCode = searchParams.get("gachaTypeId") || "";
    if (!gachaTypeCode) {
      return NextResponse.json(
        { error: "gachaTypeId は必須です" },
        { status: 400 }
      );
    }

    const gachaType = await prisma.gachaType.findUnique({
      where: { code: gachaTypeCode },
      select: { id: true },
    });
    if (!gachaType) {
      return NextResponse.json(
        { error: "ガチャタイプが見つかりません" },
        { status: 404 }
      );
    }

    const assignments = await prisma.gachaPrizeAssignment.findMany({
      where: { gachaTypeId: gachaType.id },
      orderBy: [{ tierCode: "asc" }, { id: "asc" }],
      include: {
        tier: { select: { code: true, label: true, displayOrder: true, isActive: true } },
        item: {
          select: {
            id: true,
            name: true,
            usageType: true,
            imageUrl: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("管理者: 景品割当一覧取得エラー:", error);
    return NextResponse.json(
      { error: "景品割当一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 景品割当作成（管理者用）
 * POST /api/admin/prize-assignments
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateBody;
    const gachaTypeCode = typeof body.gachaTypeId === "string" ? body.gachaTypeId : "";
    const tierCode = typeof body.tierCode === "string" ? body.tierCode : "";
    const itemId = typeof body.itemId === "number" ? body.itemId : Number(body.itemId);
    const weight = typeof body.weight === "number" ? body.weight : Number(body.weight ?? 1);
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    if (!gachaTypeCode) {
      return NextResponse.json(
        { error: "gachaTypeId は必須です" },
        { status: 400 }
      );
    }
    if (!tierCode) {
      return NextResponse.json({ error: "tierCode は必須です" }, { status: 400 });
    }
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json(
        { error: "itemId が無効です" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json(
        { error: "weight は1以上である必要があります" },
        { status: 400 }
      );
    }

    const gachaType = await prisma.gachaType.findUnique({
      where: { code: gachaTypeCode },
      select: { id: true },
    });
    if (!gachaType) {
      return NextResponse.json(
        { error: "ガチャタイプが見つかりません" },
        { status: 404 }
      );
    }

    const created = await prisma.gachaPrizeAssignment.create({
      data: {
        gachaTypeId: gachaType.id,
        tierCode,
        itemId: Math.trunc(itemId),
        weight: Math.trunc(weight),
        isActive,
      },
      include: {
        tier: { select: { code: true, label: true, displayOrder: true, isActive: true } },
        item: {
          select: {
            id: true,
            name: true,
            usageType: true,
            imageUrl: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment: created });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "同じ割当が既に存在します" },
        { status: 400 }
      );
    }
    console.error("管理者: 景品割当作成エラー:", error);
    return NextResponse.json(
      { error: "景品割当の作成に失敗しました" },
      { status: 500 }
    );
  }
}


