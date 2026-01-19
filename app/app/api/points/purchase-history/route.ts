import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
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
        count: (args: {
          where: PointPurchaseLogWhere;
        }) => Promise<number>;
      };
      pointHistory: {
        findMany: (args: {
          where: PointHistoryWhere;
          select: PointHistorySelect;
          orderBy: PointHistoryOrderBy;
        }) => Promise<PointHistory[]>;
      };
      pointPurchasePlan: {
        findMany: (args: {
          where?: PointPurchasePlanWhere;
        }) => Promise<PointPurchasePlan[]>;
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

    const plans = planIds.length > 0
      ? await prismaAny.pointPurchasePlan.findMany({
          where: {
            id: { in: planIds },
          },
        })
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
    console.error('購入履歴取得エラー:', error);
    return NextResponse.json(
      { error: '購入履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
