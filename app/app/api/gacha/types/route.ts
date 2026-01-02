import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        name: true,
        description: true,
        iconImageUrl: true,
        pointCost: true,
        isActive: true,
        startAt: true,
        endAt: true,
        useDefaultVideos: true,
        commonVideoIds: true,
        rarityVideoIds: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // デフォルト設定を取得
    const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const hasDefaultVideos = defaultSettings && 
      defaultSettings.commonVideoIds && 
      defaultSettings.commonVideoIds.length > 0;

    // 動画設定があるガチャタイプのみをフィルタリング
    const gachaTypes = allGachaTypes.filter((gachaType) => {
      // 個別設定を使用する場合
      if (gachaType.useDefaultVideos === false) {
        // 個別設定に共通動画があるか確認
        const hasCommonVideos = gachaType.commonVideoIds && 
          Array.isArray(gachaType.commonVideoIds) && 
          gachaType.commonVideoIds.length > 0;
        
        if (!hasCommonVideos) {
          return false;
        }

        // 等級別動画の設定を確認
        let hasRarityVideos = false;
        if (gachaType.rarityVideoIds) {
          try {
            const rarityVideoIdsObj = typeof gachaType.rarityVideoIds === 'string'
              ? JSON.parse(gachaType.rarityVideoIds)
              : gachaType.rarityVideoIds;
            
            if (typeof rarityVideoIdsObj === 'object' && rarityVideoIdsObj !== null) {
              const requiredRarities = ['FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'FOURTH_PRIZE', 'FIFTH_PRIZE'];
              hasRarityVideos = requiredRarities.every((rarity) => {
                const videoIds = (rarityVideoIdsObj as Record<string, number[]>)[rarity] || [];
                return videoIds.length > 0;
              });
            }
          } catch (error) {
            console.error(`ガチャタイプ ${gachaType.id} の等級別動画設定解析エラー:`, error);
          }
        }

        return hasRarityVideos;
      } else {
        // デフォルト設定を使用する場合
        return hasDefaultVideos;
      }
    }).map((gachaType) => ({
      id: gachaType.id,
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
    console.error('ガチャタイプ一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'ガチャタイプ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}





