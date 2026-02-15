import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

const DISPLAY_ORDER_MIN = 0;
const DISPLAY_ORDER_MAX = 9999;

const getTierUsageCount = async (tierCode: string) => {
  const [tierWeightsCount, assignmentsCount, historiesCount] = await Promise.all([
    prisma.gachaTierWeight.count({ where: { tierCode } }),
    prisma.gachaPrizeAssignment.count({ where: { tierCode } }),
    prisma.gachaHistory.count({ where: { tierCode } }),
  ]);
  return tierWeightsCount + assignmentsCount + historiesCount;
};

/**
 * 等級マスタ更新
 * PUT /api/admin/prize-tiers/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifyAdminAuth(request)) {
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
    const currentTier = await prisma.prizeTier.findUnique({
      where: { id: tierId },
      select: { id: true, code: true, isActive: true },
    });

    if (!currentTier) {
      return NextResponse.json(
        { error: "等級マスタが見つかりません" },
        { status: 404 }
      );
    }

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
    if (displayOrder !== undefined) {
      const normalizedDisplayOrder = Number(displayOrder);
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
      data.displayOrder = normalizedDisplayOrder;
    }
    if (typeof isActive === "boolean") {
      if (currentTier.isActive && !isActive) {
        const usageCount = await getTierUsageCount(currentTier.code);
        if (usageCount > 0) {
          return NextResponse.json(
            {
              error:
                "この等級は使用中のガチャに設定済みのため無効化できません。設定を解除してから再実行してください。",
            },
            { status: 400 }
          );
        }
      }
      data.isActive = isActive;
    }

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
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tierId = parseInt(id, 10);
    if (!Number.isFinite(tierId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

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

    const usageCount = await getTierUsageCount(tier.code);
    if (usageCount > 0) {
      return NextResponse.json({
        error:
          "この等級は使用中のガチャに設定済みのため削除できません。設定を解除してから再実行してください。",
      }, { status: 400 });
    }

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




