import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminAuthContext, verifyAdminAuth } from "@/lib/admin-auth";
import type { Prisma } from "@prisma/client";
import { recordAdminAction } from "@/lib/admin-action-history";
import { AdminActionType } from "@/lib/admin-action-types";

/**
 * ガチャタイプ一覧を取得
 * GET /api/admin/gacha-types
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const isOngoing = searchParams.get("isOngoing"); // 'true' | 'false'
    const sortBy = searchParams.get("sortBy") || "createdAt"; // 'createdAt' | 'name' | 'pointCost'
    const sortOrder = searchParams.get("sortOrder") || "desc"; // 'asc' | 'desc'

    const now = new Date();
    const where: Prisma.GachaTypeWhereInput = {};

    // 有効/無効で絞り込み
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    // 開催中で絞り込み
    if (isOngoing === "true") {
      where.AND = [
        { isActive: true },
        {
          OR: [{ startAt: null }, { startAt: { lte: now } }],
        },
        {
          OR: [{ endAt: null }, { endAt: { gte: now } }],
        },
      ];
    } else if (isOngoing === "false") {
      where.OR = [
        { isActive: false },
        {
          AND: [{ startAt: { gt: now } }],
        },
        {
          AND: [{ endAt: { lt: now } }],
        },
      ];
    }

    // ソート条件
    let orderBy: Prisma.GachaTypeOrderByWithRelationInput = {};
    if (sortBy === "name") {
      orderBy = { name: sortOrder === "asc" ? "asc" : "desc" };
    } else if (sortBy === "pointCost") {
      orderBy = { pointCost: sortOrder === "asc" ? "asc" : "desc" };
    } else {
      orderBy = { createdAt: sortOrder === "asc" ? "asc" : "desc" };
    }

    const gachaTypesRaw = await prisma.gachaType.findMany({
      where,
      orderBy,
      include: {
        // 正: ガチャ別確率（等級×重み）
        tierWeights: {
          select: {
            tierCode: true,
            weight: true,
            displayOrder: true,
            isActive: true,
          },
          orderBy: [{ displayOrder: "asc" }, { tierCode: "asc" }],
        },
      },
    } as any);

    // admin UI compatibility: this page historically used `rarityVideoIds`
    // but the DB/prisma field name is `tierVideoAssetIds`.
    const gachaTypes = gachaTypesRaw.map((gt) => ({
      ...gt,
      rarityVideoIds: (gt as any).tierVideoAssetIds ?? null,
    }));

    return NextResponse.json({ gachaTypes });
  } catch (error) {
    console.error("ガチャタイプ一覧取得エラー:", error);
    return NextResponse.json(
      { error: "ガチャタイプ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * ガチャタイプを作成または更新
 * POST /api/admin/gacha-types
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const POINT_COST_MIN = 0;
    const POINT_COST_MAX = 1000000;
    const TIER_WEIGHT_MIN = 0;
    const TIER_WEIGHT_MAX = 1000000;

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
      code,
      name,
      description,
      iconImageUrl,
      isActive,
      startAt,
      endAt,
      pointCost,
      prizeWeights,
      prizeHands,
      prizeOrder,
      resultMessageTemplateId,
      tierWeights,
      tierOrder,
      useDefaultVideos,
      rarityVideoIds,
    } = body;

    // バリデーション
    if (!code || !name) {
      return NextResponse.json(
        { error: "code と名前は必須です" },
        { status: 400 }
      );
    }

    const normalizedPointCost = Number(pointCost ?? 0);
    if (
      !Number.isFinite(normalizedPointCost) ||
      !Number.isInteger(normalizedPointCost) ||
      normalizedPointCost < POINT_COST_MIN ||
      normalizedPointCost > POINT_COST_MAX
    ) {
      return NextResponse.json(
        {
          error: `ポイントコストは${POINT_COST_MIN.toLocaleString()}〜${POINT_COST_MAX.toLocaleString()}の整数で入力してください`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.gachaType.findUnique({
      where: { code },
      select: { id: true, name: true, isActive: true },
    });

    const normalizedTemplateId =
      resultMessageTemplateId === null || resultMessageTemplateId === undefined
        ? null
        : Number(resultMessageTemplateId);
    if (
      normalizedTemplateId !== null &&
      (!Number.isFinite(normalizedTemplateId) || normalizedTemplateId <= 0)
    ) {
      return NextResponse.json(
        { error: "resultMessageTemplateId が無効です" },
        { status: 400 }
      );
    }

    // 重みの合計を確認（任意のバリデーション）
    const parsedPrizeWeights = prizeWeights
      ? typeof prizeWeights === "string"
        ? JSON.parse(prizeWeights)
        : prizeWeights
      : null;
    const totalWeight = parsedPrizeWeights
      ? Object.values(parsedPrizeWeights).reduce(
          (sum: number, w) => sum + (Number(w) || 0),
          0
        )
      : 0;

    const parsedTierWeights: Record<string, number> | null = tierWeights
      ? typeof tierWeights === "string"
        ? JSON.parse(tierWeights)
        : tierWeights
      : null;
    const parsedTierOrder: string[] | null = tierOrder
      ? typeof tierOrder === "string"
        ? JSON.parse(tierOrder)
        : tierOrder
      : null;

    // rarityVideoIdsをパース（tierVideoAssetIdsとして保存）
    // useDefaultVideosがtrueの場合はnull、falseの場合はrarityVideoIdsを使用
    const parsedRarityVideoIds: Record<string, number[]> | null = 
      useDefaultVideos === false && rarityVideoIds
        ? typeof rarityVideoIds === "string"
          ? JSON.parse(rarityVideoIds)
          : rarityVideoIds
        : null;

    const selectedTierCodes: string[] = (() => {
      if (Array.isArray(parsedTierOrder) && parsedTierOrder.length > 0) {
        return parsedTierOrder;
      }
      if (parsedTierWeights && typeof parsedTierWeights === "object") {
        return Object.keys(parsedTierWeights);
      }
      return [];
    })();

    // 動画を個別設定する場合、選択済み等級の動画が不足していれば強制的に無効化する
    const hasMissingTierVideos =
      useDefaultVideos === false &&
      selectedTierCodes.some((tierCode) => {
        const videoIds = (parsedRarityVideoIds?.[tierCode] ?? []) as number[];
        return videoIds.length === 0;
      });
    const normalizedIsActive =
      hasMissingTierVideos ? false : (isActive ?? true);

    if (parsedTierWeights) {
      for (const [tierCode, weight] of Object.entries(parsedTierWeights)) {
        const numericWeight = Number(weight);
        if (
          !Number.isFinite(numericWeight) ||
          !Number.isInteger(numericWeight) ||
          numericWeight < TIER_WEIGHT_MIN ||
          numericWeight > TIER_WEIGHT_MAX
        ) {
          return NextResponse.json(
            {
              error: `等級「${tierCode}」の重みは${TIER_WEIGHT_MIN.toLocaleString()}〜${TIER_WEIGHT_MAX.toLocaleString()}の整数で入力してください`,
            },
            { status: 400 }
          );
        }
      }
    }

    // ガチャタイプを作成または更新 + tierWeights を同期（GachaTierWeightを正にする）
    const gachaType = await prisma.$transaction(async (tx) => {
      const saved = await tx.gachaType.upsert({
        where: { code },
        update: {
          code,
          name,
          description: description || null,
          iconImageUrl: iconImageUrl || null,
          isActive: normalizedIsActive,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          pointCost: normalizedPointCost,
          prizeWeights: prizeWeights
            ? typeof prizeWeights === "string"
              ? JSON.parse(prizeWeights)
              : prizeWeights
            : null,
          prizeHands: prizeHands
            ? typeof prizeHands === "string"
              ? JSON.parse(prizeHands)
              : prizeHands
            : null,
          prizeOrder: prizeOrder
            ? typeof prizeOrder === "string"
              ? JSON.parse(prizeOrder)
              : prizeOrder
            : null,
          resultMessageTemplateId: normalizedTemplateId,
          useDefaultVideos: useDefaultVideos ?? true,
          tierVideoAssetIds: parsedRarityVideoIds as any,
        },
        create: {
          code,
          name,
          description: description || null,
          iconImageUrl: iconImageUrl || null,
          isActive: normalizedIsActive,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          pointCost: normalizedPointCost,
          prizeWeights: prizeWeights
            ? typeof prizeWeights === "string"
              ? JSON.parse(prizeWeights)
              : prizeWeights
            : null,
          prizeHands: prizeHands
            ? typeof prizeHands === "string"
              ? JSON.parse(prizeHands)
              : prizeHands
            : null,
          prizeOrder: prizeOrder
            ? typeof prizeOrder === "string"
              ? JSON.parse(prizeOrder)
              : prizeOrder
            : null,
          resultMessageTemplateId: normalizedTemplateId,
          useDefaultVideos: useDefaultVideos ?? true,
          tierVideoAssetIds: parsedRarityVideoIds as any,
        },
      });

      if (parsedTierWeights) {
        const order =
          Array.isArray(parsedTierOrder) && parsedTierOrder.length > 0
            ? parsedTierOrder.filter((tierCode) => tierCode in parsedTierWeights)
            : Object.keys(parsedTierWeights);

        const activatedTierCodes: string[] = [];
        for (let i = 0; i < order.length; i++) {
          const tierCode = order[i];
          const w = Number((parsedTierWeights as any)[tierCode] ?? 0);
          if (!Number.isFinite(w) || w < 0) continue;
          activatedTierCodes.push(tierCode);
          await (tx as any).gachaTierWeight.upsert({
            where: {
              gachaTypeId_tierCode: { gachaTypeId: saved.id, tierCode },
            },
            update: {
              weight: Math.trunc(w),
              displayOrder: (i + 1) * 10,
              isActive: true,
            },
            create: {
              gachaTypeId: saved.id,
              tierCode,
              weight: Math.trunc(w),
              displayOrder: (i + 1) * 10,
              isActive: true,
            },
          });
        }

        if (activatedTierCodes.length > 0) {
          await (tx as any).gachaTierWeight.updateMany({
            where: {
              gachaTypeId: saved.id,
              tierCode: { notIn: activatedTierCodes },
            },
            data: { isActive: false },
          });
        } else {
          await (tx as any).gachaTierWeight.updateMany({
            where: { gachaTypeId: saved.id },
            data: { isActive: false },
          });
        }
      }

      return saved;
    });

    await recordAdminAction({
      actionType: existing
        ? AdminActionType.GACHA_TYPE_UPDATE
        : AdminActionType.GACHA_TYPE_CREATE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
      description: existing
        ? `ガチャタイプを更新: ${gachaType.code}`
        : `ガチャタイプを作成: ${gachaType.code}`,
      metadata: {
        code: gachaType.code,
        name: gachaType.name,
        previousName: existing?.name ?? null,
        previousIsActive: existing?.isActive ?? null,
        isActive: gachaType.isActive,
        forcedInactiveByMissingTierVideos: hasMissingTierVideos,
        selectedTierCodes,
        startAt: gachaType.startAt,
        endAt: gachaType.endAt,
        pointCost: gachaType.pointCost,
        resultMessageTemplateId: gachaType.resultMessageTemplateId,
        useDefaultVideos: gachaType.useDefaultVideos,
        tierWeights: parsedTierWeights,
        tierOrder: parsedTierOrder,
      },
    });

    return NextResponse.json({ gachaType });
  } catch (error) {
    console.error("ガチャタイプ作成/更新エラー:", error);
    return NextResponse.json(
      { error: "ガチャタイプの作成/更新に失敗しました" },
      { status: 500 }
    );
  }
}
