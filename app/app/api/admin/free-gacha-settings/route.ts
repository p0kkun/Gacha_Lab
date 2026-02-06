import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminAuthContext, verifyAdminAuth } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-action-history";
import { AdminActionType } from "@/lib/admin-action-types";

/**
 * 無料ガチャ設定を取得
 * GET /api/admin/free-gacha-settings
 */
export async function GET(request: NextRequest) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 設定は1行のみ（シングルトン）
    let settings = await prisma.freeGachaSettings.findFirst();

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      settings = {
        id: 0,
        isActive: false,
        grantOnReferralComplete: false,
        referrerGachaTypeId: null,
        refereeGachaTypeId: null,
        expirationDays: null,
        referrerPoints: 100,
        refereePoints: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // ガチャタイプ情報も取得
    const gachaTypes = await prisma.gachaType.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    });

    return NextResponse.json({
      settings,
      gachaTypes,
    });
  } catch (error) {
    console.error("無料ガチャ設定取得エラー:", error);
    return NextResponse.json(
      { error: "設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 無料ガチャ設定を更新
 * PUT /api/admin/free-gacha-settings
 */
export async function PUT(request: NextRequest) {
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
    const {
      isActive,
      grantOnReferralComplete,
      referrerGachaTypeCode,
      refereeGachaTypeCode,
      expirationDays,
      referrerPoints,
      refereePoints,
    }: {
      isActive?: boolean;
      grantOnReferralComplete?: boolean;
      referrerGachaTypeCode?: string | null;
      refereeGachaTypeCode?: string | null;
      expirationDays?: number | null;
      referrerPoints?: number;
      refereePoints?: number;
    } = body;

    // ガチャタイプコードからIDを取得
    let referrerGachaTypeId: number | null = null;
    let refereeGachaTypeId: number | null = null;

    if (referrerGachaTypeCode) {
      const referrerGachaType = await prisma.gachaType.findUnique({
        where: { code: referrerGachaTypeCode },
        select: { id: true },
      });
      if (!referrerGachaType) {
        return NextResponse.json(
          { error: "紹介者用ガチャタイプが見つかりません" },
          { status: 400 }
        );
      }
      referrerGachaTypeId = referrerGachaType.id;
    }

    if (refereeGachaTypeCode) {
      const refereeGachaType = await prisma.gachaType.findUnique({
        where: { code: refereeGachaTypeCode },
        select: { id: true },
      });
      if (!refereeGachaType) {
        return NextResponse.json(
          { error: "被紹介者用ガチャタイプが見つかりません" },
          { status: 400 }
        );
      }
      refereeGachaTypeId = refereeGachaType.id;
    }

    // 有効期限の検証
    if (expirationDays !== null && expirationDays !== undefined) {
      if (!Number.isFinite(expirationDays) || expirationDays < 0) {
        return NextResponse.json(
          { error: "有効期限は0以上の整数である必要があります" },
          { status: 400 }
        );
      }
    }

    // 設定を取得または作成
    const existing = await prisma.freeGachaSettings.findFirst();
    const data: any = {
      isActive: isActive ?? false,
      grantOnReferralComplete: grantOnReferralComplete ?? false,
      referrerGachaTypeId,
      refereeGachaTypeId,
      expirationDays: expirationDays === null || expirationDays === undefined ? null : Math.trunc(expirationDays),
      referrerPoints: referrerPoints !== null && referrerPoints !== undefined ? Math.trunc(referrerPoints) : (existing?.referrerPoints ?? 100),
      refereePoints: refereePoints !== null && refereePoints !== undefined ? Math.trunc(refereePoints) : (existing?.refereePoints ?? 100),
    };

    const updated = existing
      ? await prisma.freeGachaSettings.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.freeGachaSettings.create({ data });

    await recordAdminAction({
      actionType: AdminActionType.FREE_GACHA_SETTINGS_UPDATE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
      description: "無料ガチャ設定を更新",
      metadata: {
        previous: existing ?? null,
        updated,
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (error: any) {
    console.error("無料ガチャ設定更新エラー:", error);
    return NextResponse.json(
      { error: "設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}



