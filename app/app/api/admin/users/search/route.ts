import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ユーザー検索API
 * GET /api/admin/users/search?q=xxx
 * POST /api/admin/users/search (タグIDで検索)
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ users: [] });
    }

    // ユーザーを検索
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userId: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        userId: true,
        displayName: true,
        pictureUrl: true,
        createdAt: true,
      },
      take: 50, // 最大50件
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー検索に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タグIDまたは条件でユーザーを検索
 * POST /api/admin/users/search
 * body: { tagIds?: number[], conditions?: SearchConditions }
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tagIds, conditions } = body;

    let userIds: string[] = [];

    // タグIDで検索する場合
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      // タグIDの配列を数値に変換
      const tagIdNumbers = tagIds.map((id: string | number) => parseInt(String(id)));

      // タグに紐づくユーザーを取得
      const userTags = await prisma.userTag.findMany({
        where: {
          tagId: {
            in: tagIdNumbers,
          },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'], // 重複を除去
      });

      userIds = userTags.map((ut) => ut.userId);
    }
    // 条件で検索する場合（タグ一括付与のプレビュー用）
    else if (conditions) {
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
          select: { id: true, code: true, name: true },
        });
        if (!gt) {
          console.error(
            `ガチャタイプが見つかりません: code=${gachaTypeId}`
          );
          // プレビューの場合は空の結果を返す（エラーにしない）
          return NextResponse.json({ count: 0 });
        }
        const gachaUserIds = await prisma.gachaHistory.findMany({
          where: { gachaTypeId: gt.id },
          select: { userId: true },
          distinct: ['userId'],
        });
        console.log(
          `ガチャタイプ ${gt.name} (code: ${gt.code}, id: ${gt.id}) を引いたユーザー数: ${gachaUserIds.length}`
        );
        userIdSets.push(new Set(gachaUserIds.map((h) => h.userId)));
      }

      // 最小課金額
      if (minPurchaseAmount !== undefined && minPurchaseAmount > 0) {
        const purchaseHistories = await prisma.pointHistory.groupBy({
          by: ['userId'],
          where: {
            transactionType: 'PURCHASE',
            amount: { gt: 0 },
          },
          _sum: {
            amount: true,
          },
        });
        const purchaseUserIds = purchaseHistories
          .filter((h) => (h._sum.amount || 0) >= minPurchaseAmount)
          .map((h) => h.userId);
        userIdSets.push(new Set(purchaseUserIds));
      }

      // 最小紹介人数
      if (minReferralCount !== undefined && minReferralCount > 0) {
        const referralCounts = await prisma.referralUser.groupBy({
          by: ['userId'],
          _count: {
            toUserId: true,
          },
        });
        const referralUserIds = referralCounts
          .filter((r) => (r._count.toUserId || 0) >= minReferralCount)
          .map((r) => r.userId);
        userIdSets.push(new Set(referralUserIds));
      }

      // 特定等級で当選したユーザー（tierCode）
      if (rarity) {
        const rarityUserIds = await prisma.gachaHistory.findMany({
          where: {
            tierCode: String(rarity),
          },
          select: { userId: true },
          distinct: ['userId'],
        });
        userIdSets.push(new Set(rarityUserIds.map((h) => h.userId)));
      }

      // アイテム使用済み
      if (hasUsedItem !== undefined) {
        let itemUserIds: { userId: string }[] = [];
        if (hasUsedItem) {
          // アイテムを使用したユーザーを取得
          const usageLogs = await prisma.itemUsageLog.findMany({
            select: { userId: true },
            distinct: ['userId'],
          });
          itemUserIds = usageLogs.map((log) => ({ userId: log.userId }));
        } else {
          // アイテムを使用していないユーザーを取得（全ユーザーから使用済みユーザーを除外）
          const usedUserIds = await prisma.itemUsageLog.findMany({
            select: { userId: true },
            distinct: ['userId'],
          });
          const usedUserIdSet = new Set(usedUserIds.map((log) => log.userId));
          const allUsers = await prisma.user.findMany({
            select: { userId: true },
          });
          itemUserIds = allUsers
            .filter((u) => !usedUserIdSet.has(u.userId))
            .map((u) => ({ userId: u.userId }));
        }
        userIdSets.push(new Set(itemUserIds.map((h) => h.userId)));
      }

      // 最小ガチャ実行回数
      if (minGachaCount !== undefined && minGachaCount > 0) {
        const gachaCounts = await prisma.gachaHistory.groupBy({
          by: ['userId'],
          _count: {
            id: true,
          },
        });
        const gachaCountUserIds = gachaCounts
          .filter((g) => (g._count.id || 0) >= minGachaCount)
          .map((g) => g.userId);
        userIdSets.push(new Set(gachaCountUserIds));
      }

      // すべての条件を満たすユーザーIDを取得（AND条件）
      if (userIdSets.length > 0) {
        let finalUserIds = Array.from(userIdSets[0]);
        for (let i = 1; i < userIdSets.length; i++) {
          finalUserIds = finalUserIds.filter((id) => userIdSets[i].has(id));
        }
        userIds = finalUserIds;
      }
    } else {
      return NextResponse.json({ users: [], count: 0 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ users: [], count: 0 });
    }

    // ユーザー情報を取得（条件検索の場合は不要なので、countのみ返す）
    if (conditions) {
      return NextResponse.json({ count: userIds.length });
    }

    // タグ検索の場合はユーザー情報も返す
    const users = await prisma.user.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        userId: true,
        displayName: true,
        pictureUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users, count: users.length });
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー検索に失敗しました' },
      { status: 500 }
    );
  }
}
