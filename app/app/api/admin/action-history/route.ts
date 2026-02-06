import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * 管理画面操作履歴を取得
 * GET /api/admin/action-history
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const actionType = searchParams.get('actionType');
    const adminUserId = searchParams.get('adminUserId');
    const targetUserId = searchParams.get('targetUserId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // フィルタ条件を構築
    const where: {
      actionType?: string;
      adminUserId?: number;
      actionTargetId?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (actionType) {
      where.actionType = actionType;
    }

    if (adminUserId) {
      const adminUserIdNumber = Number(adminUserId);
      if (!Number.isNaN(adminUserIdNumber)) {
        where.adminUserId = adminUserIdNumber;
      }
    }

    if (targetUserId) {
      // まずは単一ターゲットIDでフィルタ
      where.actionTargetId = targetUserId;
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
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    // 既存UIの形に整形
    const formattedHistories = histories.map((history) => {
      const metadata =
        history.metadata && typeof history.metadata === 'object'
          ? history.metadata
          : null;
      const targetUserIdsRaw =
        metadata && Array.isArray((metadata as { targetUserIds?: unknown }).targetUserIds)
          ? (metadata as { targetUserIds: string[] }).targetUserIds
          : [];

      return {
        id: history.id,
        actionType: history.actionType,
        adminUserId: history.adminUserId ? String(history.adminUserId) : null,
        adminName: history.adminName ?? null,
        targetUserId: history.actionTargetId ?? null,
        targetUserIds: targetUserIdsRaw,
        description: history.message ?? '',
        metadata,
        createdAt: history.createdAt,
      };
    });

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
