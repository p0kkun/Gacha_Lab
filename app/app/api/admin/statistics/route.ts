import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';

/**
 * 統計情報を取得
 * GET /api/admin/statistics?period=month
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 'day' | 'month' | 'custom'
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const filterType = searchParams.get('filterType') || 'all'; // 'all' | 'active' | 'inactive' | 'selected'
    const selectedGachaTypeIds = searchParams.get('gachaTypeIds')?.split(',') || []; // 選択したガチャタイプID（カンマ区切り）

    // 期間の開始日と終了日を計算
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (period === 'custom' && startDateParam && endDateParam) {
      // カスタム期間
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      // 終了日の時刻を23:59:59に設定
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 絞り込み条件に基づいてガチャタイプを取得
    let targetGachaTypeIds: string[] = [];
    
    if (filterType === 'selected' && selectedGachaTypeIds.length > 0) {
      // 選択したガチャのみ
      targetGachaTypeIds = selectedGachaTypeIds;
    } else {
      // すべてのガチャタイプを取得してフィルタリング
      const allGachaTypes = await prisma.gachaType.findMany({
        select: { id: true, isActive: true, startAt: true, endAt: true },
      });

      if (filterType === 'active') {
        // 現行で稼働しているもののみ
        const now = new Date();
        targetGachaTypeIds = allGachaTypes
          .filter((gt) => {
            if (!gt.isActive) return false;
            if (gt.startAt && gt.startAt > now) return false;
            if (gt.endAt && gt.endAt < now) return false;
            return true;
          })
          .map((gt) => gt.id);
      } else if (filterType === 'inactive') {
        // 過去のものすべて
        const now = new Date();
        targetGachaTypeIds = allGachaTypes
          .filter((gt) => {
            if (!gt.isActive) return true;
            if (gt.endAt && gt.endAt < now) return true;
            return false;
          })
          .map((gt) => gt.id);
      } else {
        // すべて
        targetGachaTypeIds = allGachaTypes.map((gt) => gt.id);
      }
    }

    // ガチャごとの統計（実行回数）
    const gachaStats = await prisma.gachaHistory.groupBy({
      by: ['gachaTypeId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(targetGachaTypeIds.length > 0 && {
          gachaTypeId: { in: targetGachaTypeIds },
        }),
      },
      _count: {
        id: true,
      },
      _sum: {
        pointsUsed: true,
      },
    });

    // ガチャタイプ情報を取得
    const gachaTypeIds = gachaStats.map((stat) => stat.gachaTypeId);
    const gachaTypes = await prisma.gachaType.findMany({
      where: { id: { in: gachaTypeIds } },
      select: { id: true, name: true, pointCost: true },
    });

    // ガチャ別の課金人数（ユニークユーザー数）を取得
    const gachaPurchaseStats = await Promise.all(
      gachaTypeIds.map(async (gachaTypeId) => {
        // そのガチャを実行したユニークユーザー数
        const uniqueUsers = await prisma.gachaHistory.findMany({
          where: {
            gachaTypeId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { userId: true },
          distinct: ['userId'],
        });

        // そのガチャで消費されたポイントの合計
        const totalPointsUsed = await prisma.gachaHistory.aggregate({
          where: {
            gachaTypeId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            pointsUsed: true,
          },
        });

        return {
          gachaTypeId,
          uniqueUserCount: uniqueUsers.length,
          totalPointsUsed: totalPointsUsed._sum.pointsUsed || 0,
        };
      })
    );

    // レアリティ別の統計（新方式: gacha_histories.rarity を優先）
    const whereForPeriod: any = {
      createdAt: { gte: startDate, lte: endDate },
      ...(targetGachaTypeIds.length > 0 && { gachaTypeId: { in: targetGachaTypeIds } }),
    };

    const [rarityStatsByHistory, fallbackByItem] = await Promise.all([
      prisma.gachaHistory.groupBy({
        by: ['rarity'],
        where: { ...whereForPeriod, rarity: { not: null } },
        _count: { id: true },
      }),
      prisma.gachaHistory.groupBy({
        by: ['itemId'],
        where: { ...whereForPeriod, rarity: null },
        _count: { id: true },
      }),
    ]);

    const rarityCounts: Record<string, number> = {};
    for (const stat of rarityStatsByHistory) {
      const key = stat.rarity || 'UNKNOWN';
      rarityCounts[key] = (rarityCounts[key] || 0) + stat._count.id;
    }

    // 旧データ（rarityがnull）はアイテム側rarityで補完
    if (fallbackByItem.length > 0) {
      const itemIds = fallbackByItem.map((s) => s.itemId);
      const items = await prisma.gachaItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, rarity: true },
      });
      for (const stat of fallbackByItem) {
        const item = items.find((i) => i.id === stat.itemId);
        if (!item) continue;
        rarityCounts[item.rarity] = (rarityCounts[item.rarity] || 0) + stat._count.id;
      }
    }

    // 日別の集計（指定期間のすべての日を1日ずつ表示、データがない日は0）
    // まず、指定期間のすべての日付を生成
    const allDays: Date[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const endDateForLoop = new Date(endDate);
    endDateForLoop.setHours(23, 59, 59, 999);
    
    while (currentDate <= endDateForLoop) {
      allDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // データがある日の集計を取得（Prismaの通常クエリを使用して安全に集計）
    const dailyHistories = await prisma.gachaHistory.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(targetGachaTypeIds.length > 0 && {
          gachaTypeId: { in: targetGachaTypeIds },
        }),
      },
      select: {
        createdAt: true,
      },
    });

    // 日付ごとに集計
    const dailyStatsMap = new Map<string, number>();
    dailyHistories.forEach((history) => {
      const dateKey = history.createdAt.toISOString().split('T')[0];
      dailyStatsMap.set(dateKey, (dailyStatsMap.get(dateKey) || 0) + 1);
    });

    const dailyStatsRaw = Array.from(dailyStatsMap.entries()).map(([dateKey, count]) => ({
      date: new Date(dateKey),
      count: BigInt(count),
    }));

    // すべての日付とデータを結合（データがない日は0）
    const dailyStatsMapForAllDays = new Map<string, number>();
    dailyStatsRaw.forEach((stat) => {
      const dateKey = stat.date.toISOString().split('T')[0];
      dailyStatsMapForAllDays.set(dateKey, Number(stat.count));
    });

    const dailyStats = allDays.map((date) => {
      const dateKey = date.toISOString().split('T')[0];
      return {
        date: date,
        count: dailyStatsMapForAllDays.get(dateKey) || 0,
      };
    });

    // 総ユーザー数
    const totalUsers = await prisma.user.count();

    // 総ガチャ実行回数
    const totalGachaCount = await prisma.gachaHistory.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(targetGachaTypeIds.length > 0 && {
          gachaTypeId: { in: targetGachaTypeIds },
        }),
      },
    });

    // アイテム使用状況の集計
    // 1. すべてのアイテムを取得
    const allItems = await prisma.gachaItem.findMany({
      select: {
        id: true,
        name: true,
        rarity: true,
        isActive: true,
      },
      orderBy: [
        { rarity: 'asc' },
        { name: 'asc' },
      ],
    });

    // 2. アイテムごとの所持数・使用数を集計
    const itemUsageData = await Promise.all(
      allItems.map(async (item) => {
        // 所持数（ユニークユーザー数）
        const ownershipUsers = await prisma.gachaHistory.findMany({
          where: {
            itemId: item.id,
            ...(targetGachaTypeIds.length > 0 && {
              gachaTypeId: { in: targetGachaTypeIds },
            }),
          },
          select: { userId: true },
          distinct: ['userId'],
        });
        const ownershipCount = ownershipUsers.length;

        // 使用数（usedAtがnullでない件数）
        const usageCount = await prisma.gachaHistory.count({
          where: {
            itemId: item.id,
            usedAt: { not: null },
            ...(targetGachaTypeIds.length > 0 && {
              gachaTypeId: { in: targetGachaTypeIds },
            }),
          },
        });

        // 所持率・使用率を計算
        const ownershipRate = totalUsers > 0 ? (ownershipCount / totalUsers) * 100 : 0;
        const usageRate = ownershipCount > 0 ? (usageCount / ownershipCount) * 100 : 0;

        return {
          itemId: item.id,
          itemName: item.name,
          rarity: item.rarity,
          isActive: item.isActive,
          ownershipCount,
          ownershipRate: Math.round(ownershipRate * 100) / 100, // 小数点第2位まで
          usageCount,
          usageRate: Math.round(usageRate * 100) / 100, // 小数点第2位まで
        };
      })
    );

    // レアリティ順、所持数順でソート
    const rarityOrder: Record<string, number> = {
      FIRST_PRIZE: 1,
      SECOND_PRIZE: 2,
      THIRD_PRIZE: 3,
      FOURTH_PRIZE: 4,
      FIFTH_PRIZE: 5,
      LOSER: 6,
    };
    itemUsageData.sort((a, b) => {
      const rarityDiff = (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
      if (rarityDiff !== 0) return rarityDiff;
      return b.ownershipCount - a.ownershipCount;
    });

    return NextResponse.json({
      period,
      startDate,
      endDate,
      totalUsers,
      totalGachaCount,
      gachaStats: gachaStats.map((stat) => {
        const gachaType = gachaTypes.find((gt) => gt.id === stat.gachaTypeId);
        const purchaseStat = gachaPurchaseStats.find((p) => p.gachaTypeId === stat.gachaTypeId);
        return {
          gachaTypeId: stat.gachaTypeId,
          gachaTypeName: gachaType?.name || stat.gachaTypeId,
          count: stat._count.id,
          uniqueUserCount: purchaseStat?.uniqueUserCount || 0,
          totalPointsUsed: purchaseStat?.totalPointsUsed || 0,
          pointCost: gachaType?.pointCost || 0,
        };
      }),
      rarityStats: rarityCounts,
      dailyStats: dailyStats.map((stat) => ({
        date: stat.date.toISOString().split('T')[0],
        count: stat.count,
      })),
      itemUsageStats: itemUsageData,
    });
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}


