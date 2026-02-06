import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminAuthContext, verifyAdminAuth } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-action-history";
import { AdminActionType } from "@/lib/admin-action-types";

/**
 * ガチャタイプ削除（論理削除：isActiveをfalseに、使用中の場合は削除不可）
 * DELETE /api/admin/gacha-types/[code]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authContext = await getAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true, email: true },
    });

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

      await recordAdminAction({
        actionType: AdminActionType.GACHA_TYPE_UPDATE,
        adminUserId: String(adminUser?.id ?? authContext.adminUserId),
        adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
        description: `ガチャタイプを無効化: ${gachaType.code}`,
        metadata: {
          code: gachaType.code,
          name: gachaType.name,
          previousIsActive: gachaType.isActive,
          isActive: updated.isActive,
        },
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

    await recordAdminAction({
      actionType: AdminActionType.GACHA_TYPE_DELETE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
      description: `ガチャタイプを削除: ${gachaType.code}`,
      metadata: {
        code: gachaType.code,
        name: gachaType.name,
      },
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




