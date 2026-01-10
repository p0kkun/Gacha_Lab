import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import type { Prisma } from "@prisma/client";

/**
 * ガチャタイプ一覧を取得
 * GET /api/admin/gacha-types
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
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

    const gachaTypes = await prisma.gachaType.findMany({
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
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
      firstPrizeWeight,
      secondPrizeWeight,
      thirdPrizeWeight,
      fourthPrizeWeight,
      fifthPrizeWeight,
      loserWeight,
      firstPrizeHands,
      secondPrizeHands,
      thirdPrizeHands,
      fourthPrizeHands,
      fifthPrizeHands,
      commonVideoIds,
      rarityVideoIds,
      prizeWeights,
      prizeHands,
      prizeOrder,
      resultMessageTemplateId,
      tierWeights,
      tierOrder,
      useDefaultVideos,
    } = body;

    // バリデーション
    if (!code || !name) {
      return NextResponse.json(
        { error: "code と名前は必須です" },
        { status: 400 }
      );
    }

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
    const totalWeight =
      (firstPrizeWeight || 0) +
      (secondPrizeWeight || 0) +
      (thirdPrizeWeight || 0) +
      (fourthPrizeWeight || 0) +
      (fifthPrizeWeight || 0) +
      (loserWeight || 0);

    const parsedTierWeights: Record<string, number> | null =
      tierWeights
        ? typeof tierWeights === "string"
          ? JSON.parse(tierWeights)
          : tierWeights
        : null;
    const parsedTierOrder: string[] | null =
      tierOrder
        ? typeof tierOrder === "string"
          ? JSON.parse(tierOrder)
          : tierOrder
        : null;

    // ガチャタイプを作成または更新 + tierWeights を同期（GachaTierWeightを正にする）
    const gachaType = await prisma.$transaction(async (tx) => {
      const saved = await tx.gachaType.upsert({
        where: { code },
        update: {
          code,
          name,
          description: description || null,
          iconImageUrl: iconImageUrl || null,
          isActive: isActive ?? true,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          pointCost: pointCost || 0,
          // legacy（後方互換）: いったん保持
          firstPrizeWeight: firstPrizeWeight || 0,
          secondPrizeWeight: secondPrizeWeight || 0,
          thirdPrizeWeight: thirdPrizeWeight || 0,
          fourthPrizeWeight: fourthPrizeWeight || 0,
          fifthPrizeWeight: fifthPrizeWeight || 0,
          loserWeight: loserWeight || 0,
          firstPrizeHands: Array.isArray(firstPrizeHands) ? firstPrizeHands : [],
          secondPrizeHands: Array.isArray(secondPrizeHands)
            ? secondPrizeHands
            : [],
          thirdPrizeHands: Array.isArray(thirdPrizeHands) ? thirdPrizeHands : [],
          fourthPrizeHands: Array.isArray(fourthPrizeHands)
            ? fourthPrizeHands
            : [],
          fifthPrizeHands: Array.isArray(fifthPrizeHands) ? fifthPrizeHands : [],
          // legacy（動画旧カラム）: いったん保持（別PRで削除）
          commonVideoIds: Array.isArray(commonVideoIds) ? commonVideoIds : [],
          rarityVideoIds: rarityVideoIds
            ? typeof rarityVideoIds === "string"
              ? JSON.parse(rarityVideoIds)
              : rarityVideoIds
            : null,
          // legacy（JSON確率）: いったん保持
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
        },
        create: {
          code,
          name,
          description: description || null,
          iconImageUrl: iconImageUrl || null,
          isActive: isActive ?? true,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          pointCost: pointCost || 0,
          firstPrizeWeight: firstPrizeWeight || 0,
          secondPrizeWeight: secondPrizeWeight || 0,
          thirdPrizeWeight: thirdPrizeWeight || 0,
          fourthPrizeWeight: fourthPrizeWeight || 0,
          fifthPrizeWeight: fifthPrizeWeight || 0,
          loserWeight: loserWeight || 0,
          firstPrizeHands: Array.isArray(firstPrizeHands) ? firstPrizeHands : [],
          secondPrizeHands: Array.isArray(secondPrizeHands)
            ? secondPrizeHands
            : [],
          thirdPrizeHands: Array.isArray(thirdPrizeHands) ? thirdPrizeHands : [],
          fourthPrizeHands: Array.isArray(fourthPrizeHands)
            ? fourthPrizeHands
            : [],
          fifthPrizeHands: Array.isArray(fifthPrizeHands) ? fifthPrizeHands : [],
          commonVideoIds: Array.isArray(commonVideoIds) ? commonVideoIds : [],
          rarityVideoIds: rarityVideoIds
            ? typeof rarityVideoIds === "string"
              ? JSON.parse(rarityVideoIds)
              : rarityVideoIds
            : null,
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
        },
      });

      if (parsedTierWeights && Object.keys(parsedTierWeights).length > 0) {
        const order = Array.isArray(parsedTierOrder) && parsedTierOrder.length > 0
          ? parsedTierOrder
          : Object.keys(parsedTierWeights);

        for (let i = 0; i < order.length; i++) {
          const tierCode = order[i];
          const w = Number((parsedTierWeights as any)[tierCode] ?? 0);
          if (!Number.isFinite(w) || w < 0) continue;
          await (tx as any).gachaTierWeight.upsert({
            where: { gachaTypeId_tierCode: { gachaTypeId: saved.id, tierCode } },
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
      }

      return saved;
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
