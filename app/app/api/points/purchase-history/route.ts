import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/cache';
import { CacheKeys } from '@/lib/cache-keys';
import { logError } from '@/lib/error-logger';

/**
 * ユーザーの購入履歴を取得
 * GET /api/points/purchase-history?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '29', 10);

    // バリデーションチェック
    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    // Userデータキャッシュ取得
    const userCacheKey = CacheKeys.user(userId);
    let user = await getCache<{ userId: string }>(userCacheKey);

    if (!user) {
      // LineIDをもとにusersデータ取得
      const dbUser = await prisma.user.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (!dbUser) {
        return NextResponse.json(
          { error: 'ユーザー未登録' },
          { status: 404 }
        );
      }

      // Userデータキャッシュ保存
      user = dbUser;
      await setCache(userCacheKey, user, 300); // TTL: 5分
    }

    // PointPurchaseLogとPointHistoryを結合して購入履歴を取得
    type PointPurchaseLogWhere = {
      userId: string;
      status: 'SUCCEEDED';
    };

    type PointPurchaseLogOrderBy = {
      createdAt: 'desc' | 'asc';
    };

    type PointHistoryWhere = {
      userId: string;
      historyTable: string;
      historyTableId: number;
    };

    type PointHistorySelect = {
      transactionType: boolean;
      amount: boolean;
      createdAt: boolean;
    };

    type PointHistoryOrderBy = {
      createdAt: 'asc' | 'desc';
    };

    type PointPurchasePlanWhere = {
      id?: { in: string[] };
    };

    type PointPurchaseLog = {
      id: number;
      userId: string;
      planId: string | null;
      amountYen: number;
      createdAt: Date;
    };

    type PointHistory = {
      transactionType: string;
      amount: number;
      createdAt: Date;
    };

    type PointPurchasePlan = {
      id: string;
      label: string;
    };

    const prismaAny = prisma as unknown as {
      pointPurchaseLog: {
        findMany: (args: {
          where: PointPurchaseLogWhere;
          orderBy: PointPurchaseLogOrderBy;
          skip?: number;
          take?: number;
        }) => Promise<PointPurchaseLog[]>;
        count: (args: { where: PointPurchaseLogWhere }) => Promise<number>;
      };
      pointPurchasePlan: {
        findMany: (args: {
          where?: { isActive?: boolean };
          select?: { id?: boolean; label?: boolean };
        }) => Promise<Array<{ id: string; label: string }>>;
      };
      pointHistory: {
        findMany: (args: {
          where: {
            userId: string;
            historyTable: string;
            historyTableId: number | { in: number[] };
          };
          select: {
            pointType?: boolean;
            amount: boolean;
            transactionType: boolean;
            createdAt: boolean;
          };
          orderBy?: {
            createdAt: 'asc' | 'desc';
          };
        }) => Promise<Array<{ pointType?: string; amount: number; transactionType: string; createdAt: Date }>>;
      };
    };

    // 総件数を取得
    const totalCount = await prismaAny.pointPurchaseLog.count({
      where: {
        userId,
        status: 'SUCCEEDED',
      },
    });

    // 購入ログを取得（成功したもののみ、ページネーション）
    const skip = (page - 1) * limit;
    const purchaseLogs = await prismaAny.pointPurchaseLog.findMany({
      where: {
        userId,
        status: 'SUCCEEDED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // プラン情報を取得（planIdがnullでないもの）
    const planIds = purchaseLogs
      .map((log) => log.planId)
      .filter((id): id is string => id !== null);

    // PointPurchasePlanデータキャッシュ取得（全プラン）
    const plansCacheKey = CacheKeys.pointPurchasePlans();
    let allPlans = await getCache<Array<{
      id: string;
      label: string;
    }>>(plansCacheKey);

    if (!allPlans) {
      // DBから取得
      const dbPlans = await prismaAny.pointPurchasePlan.findMany({
        where: { isActive: true },
        select: { id: true, label: true },
      });
      allPlans = dbPlans;
      // キャッシュ保存
      await setCache(plansCacheKey, allPlans, 86400); // TTL: 1日
    }

    // 必要なプランのみフィルタリング
    const plans = planIds.length > 0
      ? allPlans.filter((plan) => planIds.includes(plan.id))
      : [];

    const planMap = new Map(plans.map((plan) => [plan.id, plan]));

    // 購入履歴とポイント履歴を結合して詳細情報を取得
    const purchaseHistoryItems = await Promise.all(
      purchaseLogs.map(async (log) => {
        // ポイント履歴から有償ポイントと無償ポイントを取得
        const pointHistories = await prismaAny.pointHistory.findMany({
          where: {
            userId,
            historyTable: 'point_purchase_logs',
            historyTableId: log.id,
          },
          select: {
            transactionType: true,
            amount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const paidPointsHistory = pointHistories.find(
          (h) => h.transactionType === 'PURCHASE'
        );
        const freePointsHistory = pointHistories.find(
          (h) => h.transactionType === 'GRANT' && h.createdAt >= log.createdAt
        );

        const plan = log.planId ? planMap.get(log.planId) : null;

        return {
          id: log.id,
          paidPoints: paidPointsHistory?.amount || 0,
          freePoints: freePointsHistory?.amount || 0,
          amount: log.amountYen,
          planId: log.planId,
          planLabel: plan?.label || null,
          createdAt: log.createdAt,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      history: purchaseHistoryItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    await logError(error, { route: '/api/points/purchase-history' }, request);
    return NextResponse.json(
      { error: '購入履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
