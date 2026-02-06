import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * 購入履歴の統計情報を取得
 * GET /api/admin/statistics/purchase-history?period=day&planId=xxx&groupBy=day
 * 
 * @param period - 'day' | 'week' | 'month'
 * @param planId - プランID（オプション、指定しない場合は全プラン）
 * @param groupBy - 'day' | 'week' | 'month' | 'plan' （集計方法）
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 'day' | 'week' | 'month'
    const planId = searchParams.get('planId') || null;
    const groupBy = searchParams.get('groupBy') || 'day'; // 'day' | 'week' | 'month' | 'plan'

    // 期間の開始日と終了日を計算
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek; // 日曜日までの日数
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const prismaAny = prisma as unknown as {
      pointPurchaseLog: {
        findMany: (args: {
          where: any;
          select?: any;
        }) => Promise<any[]>;
        groupBy?: any;
      };
      pointPurchasePlan: {
        findMany: (args: {
          where?: any;
        }) => Promise<any[]>;
      };
      pointHistory: {
        findMany: (args: {
          where: any;
          select: any;
        }) => Promise<any[]>;
      };
    };

    // 購入ログを取得
    const whereClause: any = {
      status: 'SUCCEEDED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (planId) {
      whereClause.planId = planId;
    }

    const purchaseLogs = await prismaAny.pointPurchaseLog.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        planId: true,
        amountYen: true,
        createdAt: true,
      },
    });

    // プラン情報を取得
    const planIds = Array.from(
      new Set(purchaseLogs.map((log) => log.planId).filter((id): id is string => id !== null))
    );

    const plans = planIds.length > 0
      ? await prismaAny.pointPurchasePlan.findMany({
          where: {
            id: { in: planIds },
          },
        })
      : [];

    const planMap = new Map(plans.map((plan) => [plan.id, plan]));

    // ポイント履歴を取得（購入ログに関連するもの）
    const purchaseLogIds = purchaseLogs.map((log) => log.id);
    const pointHistories = purchaseLogIds.length > 0
      ? await prismaAny.pointHistory.findMany({
          where: {
            historyTable: 'point_purchase_logs',
            historyTableId: { in: purchaseLogIds },
          },
          select: {
            id: true,
            historyTableId: true,
            transactionType: true,
            amount: true,
            createdAt: true,
          },
        })
      : [];

    // 購入ログとポイント履歴を結合
    const purchaseLogMap = new Map(
      purchaseLogs.map((log) => [log.id, log])
    );

    const pointHistoryMap = new Map<number, { paid: number; free: number }>();
    for (const history of pointHistories) {
      const logId = history.historyTableId as number;
      if (!pointHistoryMap.has(logId)) {
        pointHistoryMap.set(logId, { paid: 0, free: 0 });
      }
      const points = pointHistoryMap.get(logId)!;
      if (history.transactionType === 'PURCHASE') {
        points.paid += history.amount;
      } else if (history.transactionType === 'GRANT') {
        points.free += history.amount;
      }
    }

    // 集計処理
    let aggregatedData: any[] = [];

    if (groupBy === 'plan') {
      // プランごとに集計
      const planStats = new Map<string, {
        planId: string;
        planLabel: string;
        count: number;
        totalAmount: number;
        totalPaidPoints: number;
        totalFreePoints: number;
      }>();

      for (const log of purchaseLogs) {
        const points = pointHistoryMap.get(log.id) || { paid: 0, free: 0 };
        const planId = log.planId || 'unknown';
        const plan = log.planId ? planMap.get(log.planId) : null;

        if (!planStats.has(planId)) {
          planStats.set(planId, {
            planId,
            planLabel: plan?.label || 'プラン不明',
            count: 0,
            totalAmount: 0,
            totalPaidPoints: 0,
            totalFreePoints: 0,
          });
        }

        const stat = planStats.get(planId)!;
        stat.count += 1;
        stat.totalAmount += log.amountYen;
        stat.totalPaidPoints += points.paid;
        stat.totalFreePoints += points.free;
      }

      aggregatedData = Array.from(planStats.values());
    } else {
      // 日/週/月ごとに集計
      const dateStats = new Map<string, {
        date: string;
        count: number;
        totalAmount: number;
        totalPaidPoints: number;
        totalFreePoints: number;
      }>();

      for (const log of purchaseLogs) {
        const points = pointHistoryMap.get(log.id) || { paid: 0, free: 0 };
        let dateKey: string;

        const logDate = new Date(log.createdAt);

        if (groupBy === 'week') {
          const weekStart = new Date(logDate);
          weekStart.setDate(logDate.getDate() - logDate.getDay()); // 日曜日にリセット
          dateKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        } else if (groupBy === 'month') {
          dateKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // day
          dateKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
        }

        if (!dateStats.has(dateKey)) {
          dateStats.set(dateKey, {
            date: dateKey,
            count: 0,
            totalAmount: 0,
            totalPaidPoints: 0,
            totalFreePoints: 0,
          });
        }

        const stat = dateStats.get(dateKey)!;
        stat.count += 1;
        stat.totalAmount += log.amountYen;
        stat.totalPaidPoints += points.paid;
        stat.totalFreePoints += points.free;
      }

      aggregatedData = Array.from(dateStats.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }

    // 全体統計
    const totalCount = purchaseLogs.length;
    const totalAmount = purchaseLogs.reduce((sum, log) => sum + log.amountYen, 0);
    const totalPaidPoints = Array.from(pointHistoryMap.values()).reduce(
      (sum, points) => sum + points.paid,
      0
    );
    const totalFreePoints = Array.from(pointHistoryMap.values()).reduce(
      (sum, points) => sum + points.free,
      0
    );

    // ユニーク購入者数
    const uniqueUserIds = new Set(purchaseLogs.map((log) => log.userId));
    const uniqueUserCount = uniqueUserIds.size;

    // 平均指標
    const averageAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    const averageAmountPerUser = uniqueUserCount > 0 ? Math.round(totalAmount / uniqueUserCount) : 0;
    const averagePurchaseCountPerUser = uniqueUserCount > 0 ? Number((totalCount / uniqueUserCount).toFixed(2)) : 0;

    // 前月/前週との比較データを取得
    let previousPeriodSummary: {
      totalCount: number;
      totalAmount: number;
      totalPaidPoints: number;
      totalFreePoints: number;
      uniqueUserCount: number;
    } | null = null;

    if (period === 'month' || period === 'week') {
      let previousStartDate: Date;
      let previousEndDate: Date;

      if (period === 'month') {
        // 前月の開始日と終了日
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(0); // 前月の最終日
        previousStartDate = new Date(previousEndDate.getFullYear(), previousEndDate.getMonth(), 1);
      } else {
        // 前週の開始日と終了日
        const weekStart = new Date(startDate);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? 7 : dayOfWeek; // 日曜日の場合も考慮
        previousEndDate = new Date(weekStart);
        previousEndDate.setDate(weekStart.getDate() - diff);
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setDate(previousEndDate.getDate() - 6);
      }

      const previousWhereClause: any = {
        status: 'SUCCEEDED',
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      };

      if (planId) {
        previousWhereClause.planId = planId;
      }

      const previousPurchaseLogs = await prismaAny.pointPurchaseLog.findMany({
        where: previousWhereClause,
        select: {
          id: true,
          userId: true,
          amountYen: true,
        },
      });

      const previousPurchaseLogIds = previousPurchaseLogs.map((log) => log.id);
      const previousPointHistories = previousPurchaseLogIds.length > 0
        ? await prismaAny.pointHistory.findMany({
            where: {
              historyTable: 'point_purchase_logs',
              historyTableId: { in: previousPurchaseLogIds },
            },
            select: {
              historyTableId: true,
              transactionType: true,
              amount: true,
            },
          })
        : [];

      const previousPointHistoryMap = new Map<number, { paid: number; free: number }>();
      for (const history of previousPointHistories) {
        const logId = history.historyTableId as number;
        if (!previousPointHistoryMap.has(logId)) {
          previousPointHistoryMap.set(logId, { paid: 0, free: 0 });
        }
        const points = previousPointHistoryMap.get(logId)!;
        if (history.transactionType === 'PURCHASE') {
          points.paid += history.amount;
        } else if (history.transactionType === 'GRANT') {
          points.free += history.amount;
        }
      }

      const previousTotalCount = previousPurchaseLogs.length;
      const previousTotalAmount = previousPurchaseLogs.reduce((sum, log) => sum + log.amountYen, 0);
      const previousTotalPaidPoints = Array.from(previousPointHistoryMap.values()).reduce(
        (sum, points) => sum + points.paid,
        0
      );
      const previousTotalFreePoints = Array.from(previousPointHistoryMap.values()).reduce(
        (sum, points) => sum + points.free,
        0
      );
      const previousUniqueUserIds = new Set(previousPurchaseLogs.map((log) => log.userId));

      previousPeriodSummary = {
        totalCount: previousTotalCount,
        totalAmount: previousTotalAmount,
        totalPaidPoints: previousTotalPaidPoints,
        totalFreePoints: previousTotalFreePoints,
        uniqueUserCount: previousUniqueUserIds.size,
      };
    }

    // 前月/前週との比較率を計算
    const comparison = previousPeriodSummary ? {
      countChange: previousPeriodSummary.totalCount > 0
        ? Number(((totalCount - previousPeriodSummary.totalCount) / previousPeriodSummary.totalCount * 100).toFixed(1))
        : (totalCount > 0 ? 100 : 0),
      amountChange: previousPeriodSummary.totalAmount > 0
        ? Number(((totalAmount - previousPeriodSummary.totalAmount) / previousPeriodSummary.totalAmount * 100).toFixed(1))
        : (totalAmount > 0 ? 100 : 0),
      userCountChange: previousPeriodSummary.uniqueUserCount > 0
        ? Number(((uniqueUserCount - previousPeriodSummary.uniqueUserCount) / previousPeriodSummary.uniqueUserCount * 100).toFixed(1))
        : (uniqueUserCount > 0 ? 100 : 0),
    } : null;

    return NextResponse.json({
      success: true,
      period,
      groupBy,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCount,
        totalAmount,
        totalPaidPoints,
        totalFreePoints,
        uniqueUserCount,
        averageAmount,
        averageAmountPerUser,
        averagePurchaseCountPerUser,
      },
      comparison,
      data: aggregatedData,
      plans: Array.from(planMap.values()),
    });
  } catch (error) {
    console.error('購入履歴統計取得エラー:', error);
    return NextResponse.json(
      { error: '購入履歴統計の取得に失敗しました' },
      { status: 500 }
    );
  }
}
