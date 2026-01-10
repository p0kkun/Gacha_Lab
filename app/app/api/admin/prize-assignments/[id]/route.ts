import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

type UpdateBody = {
  tierCode?: string;
  itemId?: number;
  weight?: number;
  isActive?: boolean;
};

/**
 * 景品割当更新（管理者用）
 * PUT /api/admin/prize-assignments/[id]
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
    const assignmentId = parseInt(id, 10);
    if (!Number.isFinite(assignmentId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateBody;
    const data: any = {};

    if (typeof body.tierCode === "string" && body.tierCode) data.tierCode = body.tierCode;
    if (body.itemId !== undefined) {
      const itemId = typeof body.itemId === "number" ? body.itemId : Number(body.itemId);
      if (!Number.isFinite(itemId) || itemId <= 0) {
        return NextResponse.json({ error: "itemId が無効です" }, { status: 400 });
      }
      data.itemId = Math.trunc(itemId);
    }
    if (body.weight !== undefined) {
      const weight = typeof body.weight === "number" ? body.weight : Number(body.weight);
      if (!Number.isFinite(weight) || weight <= 0) {
        return NextResponse.json(
          { error: "weight は1以上である必要があります" },
          { status: 400 }
        );
      }
      data.weight = Math.trunc(weight);
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.gachaPrizeAssignment.update({
      where: { id: assignmentId },
      data,
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

    return NextResponse.json({ assignment: updated });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "割当が見つかりません" },
        { status: 404 }
      );
    }
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "同じ割当が既に存在します" },
        { status: 400 }
      );
    }
    console.error("管理者: 景品割当更新エラー:", error);
    return NextResponse.json(
      { error: "景品割当の更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 景品割当削除（管理者用）
 * DELETE /api/admin/prize-assignments/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const assignmentId = parseInt(id, 10);
    if (!Number.isFinite(assignmentId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await prisma.gachaPrizeAssignment.delete({ where: { id: assignmentId } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "割当が見つかりません" },
        { status: 404 }
      );
    }
    console.error("管理者: 景品割当削除エラー:", error);
    return NextResponse.json(
      { error: "景品割当の削除に失敗しました" },
      { status: 500 }
    );
  }
}


