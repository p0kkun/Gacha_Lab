import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';
import { getAdminAuthContext, verifyAdminAuth } from '@/lib/admin-auth';
import type { Prisma } from '@prisma/client';

/**
 * ピックアップガチャ設定を取得
 * GET /api/admin/pickup
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appSettings = await prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        pickupGacha: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            startAt: true,
            endAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      pickupGachaId: appSettings?.pickupGachaId || null,
      pickupGacha: appSettings?.pickupGacha || null,
    });
  } catch (error) {
    await logError(error, { route: '/api/admin/pickup' }, request);
    return NextResponse.json(
      { error: 'ピックアップガチャ設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * ピックアップガチャ設定を更新
 * PUT /api/admin/pickup
 */
export async function PUT(request: NextRequest) {
  // 認証チェック
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

    const body = await request.json();
    const { pickupGachaId } = body;

    // ガチャタイプの存在確認
    if (pickupGachaId !== null) {
      const gachaType = await prisma.gachaType.findUnique({
        where: { id: pickupGachaId },
        select: { id: true, code: true, name: true, isActive: true },
      });

      if (!gachaType) {
        return NextResponse.json(
          { error: '指定されたガチャタイプが見つかりません' },
          { status: 404 }
        );
      }

      if (!gachaType.isActive) {
        return NextResponse.json(
          { error: '指定されたガチャタイプは無効です' },
          { status: 400 }
        );
      }
    }

    // 既存の設定を取得または作成
    type AppSettingsWithPickupGacha = Prisma.AppSettingsGetPayload<{
      include: {
        pickupGacha: {
          select: {
            id: true;
            code: true;
            name: true;
            isActive: true;
            startAt: true;
            endAt: true;
          };
        };
      };
    }>;

    let appSettings: AppSettingsWithPickupGacha | null = await prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        pickupGacha: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            startAt: true,
            endAt: true,
          },
        },
      },
    });

    if (appSettings) {
      // 既存の設定を更新
      appSettings = await prisma.appSettings.update({
        where: { id: appSettings.id },
        data: { pickupGachaId: pickupGachaId || null },
        include: {
          pickupGacha: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
              startAt: true,
              endAt: true,
            },
          },
        },
      });
    } else {
      // 新規作成
      appSettings = await prisma.appSettings.create({
        data: { pickupGachaId: pickupGachaId || null },
        include: {
          pickupGacha: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
              startAt: true,
              endAt: true,
            },
          },
        },
      });
    }

    // 操作履歴を記録
    await recordAdminAction({
      actionType: AdminActionType.PICKUP_GACHA_UPDATE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
      description: `ピックアップガチャを${pickupGachaId ? `設定: ${appSettings.pickupGacha?.name || ''}` : '解除'}しました`,
      metadata: {
        pickupGachaId,
        gachaCode: appSettings.pickupGacha?.code || null,
        action: 'PICKUP_GACHA_UPDATE',
      },
    });

    return NextResponse.json({
      pickupGachaId: appSettings.pickupGachaId,
      pickupGacha: appSettings.pickupGacha,
    });
  } catch (error) {
    await logError(error, { route: '/api/admin/pickup' }, request);
    return NextResponse.json(
      { error: 'ピックアップガチャ設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}
