import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { recordTagAssignAction } from "@/lib/admin-action-history";

/**
 * 条件に基づいてユーザーにタグを一括付与
 * POST /api/admin/tags/bulk-assign
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      tagId,
      userIds, // 直接ユーザーIDを指定する場合
      conditions, // 条件を指定する場合
      adminUserId,
      adminName,
    } = body;

    if (!tagId) {
      return NextResponse.json({ error: "タグIDが必要です" }, { status: 400 });
    }

    // タグが存在するか確認
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "タグが見つかりません" },
        { status: 404 }
      );
    }

    let targetUserIds: string[] = [];

    // 直接ユーザーIDが指定されている場合
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    }
    // 条件が指定されている場合
    else if (conditions) {
      // ユーザー検索ロジックを直接実行
      const {
        gachaTypeId,
        minPurchaseAmount,
        minReferralCount,
        rarity,
        hasUsedItem,
        minGachaCount,
      } = conditions;

      let userIdSets: Set<string>[] = [];

      // 特定ガチャタイプを引いたユーザー
      if (gachaTypeId) {
        // NOTE: 外部からはガチャタイプcodeを受け取る想定
        const gt = await prisma.gachaType.findUnique({
          where: { code: String(gachaTypeId) },
          select: { id: true },
        });
        if (!gt) {
          return NextResponse.json(
            { error: "ガチャタイプが見つかりません" },
            { status: 404 }
          );
        }
        const userIds = await prisma.gachaHistory.findMany({
          where: { gachaTypeId: gt.id },
          select: { userId: true },
          distinct: ["userId"],
        });
        userIdSets.push(new Set(userIds.map((h) => h.userId)));
      }

      // 最小課金額
      if (minPurchaseAmount !== undefined && minPurchaseAmount > 0) {
        const purchaseHistories = await prisma.pointHistory.groupBy({
          by: ["userId"],
          where: {
            transactionType: "PURCHASE",
            amount: { gt: 0 },
          },
          _sum: {
            amount: true,
          },
        });
        const userIds = purchaseHistories
          .filter((h) => (h._sum.amount || 0) >= minPurchaseAmount)
          .map((h) => h.userId);
        userIdSets.push(new Set(userIds));
      }

      // 最小紹介人数
      if (minReferralCount !== undefined && minReferralCount > 0) {
        const referralCounts = await prisma.referralUser.groupBy({
          by: ["userId"],
          _count: {
            toUserId: true,
          },
        });
        const userIds = referralCounts
          .filter((r) => (r._count.toUserId || 0) >= minReferralCount)
          .map((r) => r.userId);
        userIdSets.push(new Set(userIds));
      }

      // 特定等級で当選したユーザー（tierCode）
      if (rarity) {
        const userIds = await prisma.gachaHistory.findMany({
          where: {
            tierCode: String(rarity),
          },
          select: { userId: true },
          distinct: ["userId"],
        });
        userIdSets.push(new Set(userIds.map((h) => h.userId)));
      }

      // アイテム使用済み
      if (hasUsedItem !== undefined) {
        // usageLogリレーションが削除されたため、ItemUsageLogを直接検索
        let userIds: { userId: string }[] = [];
        if (hasUsedItem) {
          // アイテムを使用したユーザーを取得
          const usageLogs = await prisma.itemUsageLog.findMany({
            select: { userId: true },
            distinct: ["userId"],
          });
          userIds = usageLogs.map((log) => ({ userId: log.userId }));
        } else {
          // アイテムを使用していないユーザーを取得（全ユーザーから使用済みユーザーを除外）
          const usedUserIds = await prisma.itemUsageLog.findMany({
            select: { userId: true },
            distinct: ["userId"],
          });
          const usedUserIdSet = new Set(usedUserIds.map((log) => log.userId));
          const allUsers = await prisma.user.findMany({
            select: { userId: true },
          });
          userIds = allUsers
            .filter((u) => !usedUserIdSet.has(u.userId))
            .map((u) => ({ userId: u.userId }));
        }
        userIdSets.push(new Set(userIds.map((h) => h.userId)));
      }

      // 最小ガチャ実行回数
      if (minGachaCount !== undefined && minGachaCount > 0) {
        const gachaCounts = await prisma.gachaHistory.groupBy({
          by: ["userId"],
          _count: {
            id: true,
          },
        });
        const userIds = gachaCounts
          .filter((g) => (g._count.id || 0) >= minGachaCount)
          .map((g) => g.userId);
        userIdSets.push(new Set(userIds));
      }

      // すべての条件を満たすユーザーIDを取得（AND条件）
      if (userIdSets.length > 0) {
        let finalUserIds = Array.from(userIdSets[0]);
        for (let i = 1; i < userIdSets.length; i++) {
          finalUserIds = finalUserIds.filter((id) => userIdSets[i].has(id));
        }
        targetUserIds = finalUserIds;
      }
    } else {
      return NextResponse.json(
        { error: "ユーザーIDまたは条件を指定してください" },
        { status: 400 }
      );
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: "対象ユーザーが見つかりませんでした" },
        { status: 400 }
      );
    }

    // 既にタグが付与されているユーザーを除外
    const existingUserTags = await prisma.userTag.findMany({
      where: {
        tagId,
        userId: { in: targetUserIds },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingUserTags.map((ut) => ut.userId));
    const newUserIds = targetUserIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        total: targetUserIds.length,
        alreadyAssigned: targetUserIds.length,
        newlyAssigned: 0,
      });
    }

    // 一括でタグを付与
    const createData = newUserIds.map((userId) => ({
      userId,
      tagId,
    }));

    await prisma.userTag.createMany({
      data: createData,
      skipDuplicates: true,
    });

    // 操作履歴を記録（新規付与したユーザーに対して）
    if (newUserIds.length > 0) {
      await recordTagAssignAction({
        adminUserId: adminUserId || "unknown",
        adminName: adminName || "unknown",
        targetUserIds: newUserIds,
        tagId,
        tagName: tag.name,
        isBulk: true,
      });
    }

    return NextResponse.json({
      success: true,
      total: targetUserIds.length,
      alreadyAssigned: existingUserIds.size,
      newlyAssigned: newUserIds.length,
    });
  } catch (error) {
    console.error("一括タグ付与エラー:", error);
    return NextResponse.json(
      { error: "タグの一括付与に失敗しました" },
      { status: 500 }
    );
  }
}
