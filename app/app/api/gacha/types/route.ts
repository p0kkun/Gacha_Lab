import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

/**
 * 利用可能なガチャタイプ一覧を取得
 * 動画設定（個別設定またはデフォルト設定）があるガチャタイプのみを返す
 * GET /api/gacha/types
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // 有効で、期間内のガチャタイプを取得
    const allGachaTypes = await prisma.gachaType.findMany({
      where: {
        isActive: true,
        OR: [
          { startAt: null },
          { startAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endAt: null },
              { endAt: { gte: now } },
            ],
          },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        iconImageUrl: true,
        pointCost: true,
        isActive: true,
        createdAt: true,
        startAt: true,
        endAt: true,
        useDefaultVideos: true,
        commonVideoAssetIds: true,
        tierVideoAssetIds: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const appSettings = await prisma.appSettings.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { pickupGachaId: true },
    });

    // デフォルト設定を取得（共通動画は使用しないため、等級別動画のみチェック）
    const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // PrizeTierテーブルから等級を動的に取得（filterの前に取得）
    const prizeTiers = await prisma.prizeTier.findMany({
      where: { isActive: true },
      select: { code: true },
    });
    const requiredRarities = prizeTiers.map(t => t.code);

    // const hasDefaultVideos =
    //   defaultSettings &&
    //   (defaultSettings as any).commonVideoAssetIds &&
    //   (defaultSettings as any).commonVideoAssetIds.length > 0; // 共通動画は使用しないためコメントアウト
    
    // デフォルト設定の等級別動画をチェック
    let hasDefaultTierVideos = false;
    if (defaultSettings && (defaultSettings as any).tierVideoAssetIds) {
      try {
        const tierVideoIdsObj =
          typeof (defaultSettings as any).tierVideoAssetIds === 'string'
            ? JSON.parse((defaultSettings as any).tierVideoAssetIds)
            : (defaultSettings as any).tierVideoAssetIds;
        if (typeof tierVideoIdsObj === 'object' && tierVideoIdsObj !== null) {
          hasDefaultTierVideos = requiredRarities.every((rarity) => {
            const videoIds = (tierVideoIdsObj as Record<string, number[]>)[rarity] || [];
            return videoIds.length > 0;
          });
        }
      } catch (error) {
        console.error('デフォルト設定の等級別動画解析エラー:', error);
      }
    }

    // 動画設定があるガチャタイプのみをフィルタリング
    const filteredGachaTypes = allGachaTypes.filter((gachaType) => {
      // 個別設定を使用する場合
      if (gachaType.useDefaultVideos === false) {
        // 個別設定に共通動画があるか確認（共通動画は使用しないためコメントアウト）
        // const hasCommonVideos =
        //   (gachaType as any).commonVideoAssetIds &&
        //   Array.isArray((gachaType as any).commonVideoAssetIds) &&
        //   (gachaType as any).commonVideoAssetIds.length > 0;

        // 等級別動画の設定を確認
        let hasRarityVideos = false;
        if ((gachaType as any).tierVideoAssetIds) {
          try {
            const rarityVideoIdsObj =
              typeof (gachaType as any).tierVideoAssetIds === 'string'
                ? JSON.parse((gachaType as any).tierVideoAssetIds)
                : (gachaType as any).tierVideoAssetIds;
            
            if (typeof rarityVideoIdsObj === 'object' && rarityVideoIdsObj !== null) {
              hasRarityVideos = requiredRarities.every((rarity) => {
                const videoIds = (rarityVideoIdsObj as Record<string, number[]>)[rarity] || [];
                return videoIds.length > 0;
              });
            }
          } catch (error) {
            console.error(
              `ガチャタイプ ${gachaType.code} の等級別動画設定解析エラー:`,
              error
            );
          }
        }

        // 等級別動画があればOK（共通動画は使用しないためコメントアウト）
        return hasRarityVideos;
      } else {
        // デフォルト設定を使用する場合
        return hasDefaultTierVideos;
      }
    });

    const gachaTypeIds = filteredGachaTypes.map((gt) => gt.id);
    const prizeAssignments = gachaTypeIds.length > 0
      ? await prisma.gachaPrizeAssignment.findMany({
          where: {
            gachaTypeId: { in: gachaTypeIds },
            isActive: true,
          },
          include: {
            item: { select: { name: true } },
            tier: { select: { displayOrder: true, label: true, code: true } },
          },
        })
      : [];

    const assignmentsByGacha = new Map<number, typeof prizeAssignments>();
    for (const assignment of prizeAssignments) {
      const list = assignmentsByGacha.get(assignment.gachaTypeId) || [];
      list.push(assignment);
      assignmentsByGacha.set(assignment.gachaTypeId, list);
    }

    const getMainPrizeLabel = (gachaTypeId: number): string | null => {
      const list = assignmentsByGacha.get(gachaTypeId);
      if (!list || list.length === 0) return null;

      const sorted = [...list].sort((a, b) => {
        const aOrder = a.tier?.displayOrder ?? 9999;
        const bOrder = b.tier?.displayOrder ?? 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.weight !== b.weight) return b.weight - a.weight;
        return a.id - b.id;
      });

      const top = sorted[0];
      if (top.rewardType === "POINTS") {
        return `${top.points.toLocaleString()}ポイント`;
      }
      return top.item?.name ?? null;
    };

    const sortedGachaTypes = [...filteredGachaTypes].sort((a, b) => {
      const pickupId = appSettings?.pickupGachaId ?? null;
      const aIsPickup = pickupId !== null && a.id === pickupId;
      const bIsPickup = pickupId !== null && b.id === pickupId;
      if (aIsPickup !== bIsPickup) return aIsPickup ? -1 : 1;
      const aCost = a.pointCost ?? Number.MAX_SAFE_INTEGER;
      const bCost = b.pointCost ?? Number.MAX_SAFE_INTEGER;
      if (aCost !== bCost) return aCost - bCost;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const gachaTypes = sortedGachaTypes.map((gachaType) => ({
      // NOTE: ユーザー画面・APIは外部参照用の code をIDとして扱う（後方互換）
      id: gachaType.code,
      code: gachaType.code,
      name: gachaType.name,
      description: gachaType.description,
      iconImageUrl: gachaType.iconImageUrl,
      pointCost: gachaType.pointCost,
      isActive: gachaType.isActive,
      startAt: gachaType.startAt,
      endAt: gachaType.endAt,
      mainPrizeLabel: getMainPrizeLabel(gachaType.id),
    }));

    return NextResponse.json({ gachaTypes });
  } catch (error) {
    await logError(error, { route: '/api/gacha/types' }, request);
    return NextResponse.json(
      { error: 'ガチャタイプ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

