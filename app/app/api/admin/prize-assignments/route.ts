import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { Rarity } from "@prisma/client";

type CreateBody = {
  gachaTypeId?: string;
  rarity?: Rarity;
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
    const gachaTypeId = searchParams.get("gachaTypeId") || "";
    if (!gachaTypeId) {
      return NextResponse.json(
        { error: "gachaTypeId は必須です" },
        { status: 400 }
      );
    }

    const assignments = await prisma.gachaPrizeAssignment.findMany({
      where: { gachaTypeId },
      orderBy: [{ rarity: "asc" }, { id: "asc" }],
      include: {
        item: {
          select: {
            id: true,
            name: true,
            usageType: true,
            imageUrl: true,
            videoUrl: true,
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
    const gachaTypeId = typeof body.gachaTypeId === "string" ? body.gachaTypeId : "";
    const rarity = body.rarity;
    const itemId = typeof body.itemId === "number" ? body.itemId : Number(body.itemId);
    const weight = typeof body.weight === "number" ? body.weight : Number(body.weight ?? 1);
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: "gachaTypeId は必須です" },
        { status: 400 }
      );
    }
    if (!rarity) {
      return NextResponse.json({ error: "rarity は必須です" }, { status: 400 });
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

    const created = await prisma.gachaPrizeAssignment.create({
      data: {
        gachaTypeId,
        rarity,
        itemId: Math.trunc(itemId),
        weight: Math.trunc(weight),
        isActive,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            usageType: true,
            imageUrl: true,
            videoUrl: true,
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


