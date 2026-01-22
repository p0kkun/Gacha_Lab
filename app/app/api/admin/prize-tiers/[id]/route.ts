import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

/**
 * 等級マスタ更新
 * PUT /api/admin/prize-tiers/[id]
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
    const tierId = parseInt(id, 10);
    if (!Number.isFinite(tierId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const { code, label, displayOrder, isActive } = body;

    const data: any = {};
    if (typeof code === "string" && code.trim()) {
      // コード変更時の重複チェック
      const existing = await prisma.prizeTier.findFirst({
        where: {
          code,
          NOT: { id: tierId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: `等級コード "${code}" は既に使用されています` },
          { status: 400 }
        );
      }
      data.code = code;
    }
    if (typeof label === "string") data.label = label;
    if (typeof displayOrder === "number") data.displayOrder = displayOrder;
    if (typeof isActive === "boolean") data.isActive = isActive;

    const updated = await prisma.prizeTier.update({
      where: { id: tierId },
      data,
    });

    return NextResponse.json({ tier: updated });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "等級マスタが見つかりません" },
        { status: 404 }
      );
    }
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "等級コードが重複しています" },
        { status: 400 }
      );
    }
    console.error("等級マスタ更新エラー:", error);
    return NextResponse.json(
      { error: "等級マスタの更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 等級マスタ削除（論理削除：isActiveをfalseに）
 * DELETE /api/admin/prize-tiers/[id]
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
    const tierId = parseInt(id, 10);
    if (!Number.isFinite(tierId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    // 使用されているかチェック（GachaTierWeightやGachaPrizeAssignmentなど）
    const [tierWeightsCount, assignmentsCount, historiesCount] = await Promise.all([
      prisma.gachaTierWeight.count({
        where: { tierCode: { in: await prisma.prizeTier.findUnique({ where: { id: tierId }, select: { code: true } }).then(t => t ? [t.code] : []) } },
      }),
      prisma.gachaPrizeAssignment.count({
        where: { tierCode: { in: await prisma.prizeTier.findUnique({ where: { id: tierId }, select: { code: true } }).then(t => t ? [t.code] : []) } },
      }),
      prisma.gachaHistory.count({
        where: { tierCode: { in: await prisma.prizeTier.findUnique({ where: { id: tierId }, select: { code: true } }).then(t => t ? [t.code] : []) } },
      }),
    ]);

    // 簡易版：tierCodeを直接取得
    const tier = await prisma.prizeTier.findUnique({
      where: { id: tierId },
      select: { code: true },
    });

    if (!tier) {
      return NextResponse.json(
        { error: "等級マスタが見つかりません" },
        { status: 404 }
      );
    }

    const [tierWeightsCount2, assignmentsCount2, historiesCount2] = await Promise.all([
      prisma.gachaTierWeight.count({ where: { tierCode: tier.code } }),
      prisma.gachaPrizeAssignment.count({ where: { tierCode: tier.code } }),
      prisma.gachaHistory.count({ where: { tierCode: tier.code } }),
    ]);

    if (tierWeightsCount2 > 0 || assignmentsCount2 > 0 || historiesCount2 > 0) {
      // 使用されている場合は論理削除のみ
      const updated = await prisma.prizeTier.update({
        where: { id: tierId },
        data: { isActive: false },
      });
      return NextResponse.json({
        tier: updated,
        message: "この等級は使用されているため、無効化しました",
      });
    }

    // 使用されていない場合は物理削除（実際は論理削除推奨）
    await prisma.prizeTier.delete({
      where: { id: tierId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "等級マスタが見つかりません" },
        { status: 404 }
      );
    }
    console.error("等級マスタ削除エラー:", error);
    return NextResponse.json(
      { error: "等級マスタの削除に失敗しました" },
      { status: 500 }
    );
  }
}




