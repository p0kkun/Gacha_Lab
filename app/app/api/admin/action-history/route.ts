import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import type { AdminActionType } from '.prisma/client';
import { AdminActionType as AdminActionTypeEnum } from '.prisma/client';

/**
 * 管理画面操作履歴を取得
 * GET /api/admin/action-history
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const actionType = searchParams.get('actionType') as AdminActionType | null;
    const adminUserId = searchParams.get('adminUserId');
    const targetUserId = searchParams.get('targetUserId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // フィルタ条件を構築
    const where: {
      actionType?: AdminActionType;
      adminUserId?: string;
      targetUserId?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (actionType) {
      where.actionType = actionType;
    }

    if (adminUserId) {
      where.adminUserId = adminUserId;
    }

    if (targetUserId) {
      // targetUserIdが直接一致するか、targetUserIdsのJSON配列に含まれているかをチェック
      // 注意: PrismaではJSON配列の検索が複雑なため、まずはtargetUserIdの直接一致のみをチェック
      // 将来的には生のSQLクエリでJSON配列検索を実装することも可能
      where.targetUserId = targetUserId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 履歴を取得
    const [histories, total] = await Promise.all([
      prisma.adminActionHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminActionHistory.count({ where }),
    ]);

    // targetUserIdsを配列として正しく処理
    const formattedHistories = histories.map((history) => ({
      ...history,
      targetUserIds: Array.isArray(history.targetUserIds)
        ? history.targetUserIds
        : history.targetUserIds
        ? JSON.parse(JSON.stringify(history.targetUserIds))
        : null,
    }));

    return NextResponse.json({
      histories: formattedHistories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('操作履歴取得エラー:', error);
    return NextResponse.json(
      { error: '操作履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}

