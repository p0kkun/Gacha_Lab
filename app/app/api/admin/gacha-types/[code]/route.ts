import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

/**
 * ガチャタイプ削除（論理削除：isActiveをfalseに、使用中の場合は削除不可）
 * DELETE /api/admin/gacha-types/[code]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await params;

    // ガチャタイプを取得
    const gachaType = await prisma.gachaType.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, isActive: true },
    });

    if (!gachaType) {
      return NextResponse.json(
        { error: "ガチャタイプが見つかりません" },
        { status: 404 }
      );
    }

    // 使用されているかチェック（GachaHistoryがあるか）
    const historyCount = await prisma.gachaHistory.count({
      where: { gachaTypeId: gachaType.id },
    });

    if (historyCount > 0) {
      // 使用されている場合は論理削除のみ
      const updated = await prisma.gachaType.update({
        where: { code },
        data: { isActive: false },
      });
      return NextResponse.json({
        gachaType: updated,
        message: "このガチャタイプは使用されているため、無効化しました",
      });
    }

    // 使用されていない場合は物理削除
    // 関連データも削除（GachaTierWeight, GachaPrizeAssignment）
    await prisma.$transaction(async (tx) => {
      // GachaTierWeightを削除
      await tx.gachaTierWeight.deleteMany({
        where: { gachaTypeId: gachaType.id },
      });

      // GachaPrizeAssignmentを削除
      await tx.gachaPrizeAssignment.deleteMany({
        where: { gachaTypeId: gachaType.id },
      });

      // ガチャタイプを削除
      await tx.gachaType.delete({
        where: { code },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "ガチャタイプが見つかりません" },
        { status: 404 }
      );
    }
    console.error("ガチャタイプ削除エラー:", error);
    return NextResponse.json(
      { error: "ガチャタイプの削除に失敗しました" },
      { status: 500 }
    );
  }
}




