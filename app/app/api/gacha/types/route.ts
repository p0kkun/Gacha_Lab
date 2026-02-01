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
        startAt: true,
        endAt: true,
        useDefaultVideos: true,
        commonVideoAssetIds: true,
        tierVideoAssetIds: true,
      },
      orderBy: { createdAt: 'asc' },
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
    const gachaTypes = allGachaTypes.filter((gachaType) => {
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
    }).map((gachaType) => ({
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




