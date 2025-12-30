import { prisma } from "@/lib/prisma";
import type { Rarity } from ".prisma/client";
import { Rarity as RarityEnum } from ".prisma/client";

/**
 * ガチャタイプの動画設定に基づいて動画を選択
 * 優先順位: 個別設定 > デフォルト設定
 * @param gachaTypeId ガチャタイプID
 * @param itemRarity アイテムのレアリティ
 * @returns 動画URLの配列（共通動画 → 等級別動画の順）
 */
export async function getGachaVideoUrls(
  gachaTypeId: string,
  itemRarity: Rarity
): Promise<string[]> {
  // ガチャタイプを取得（全フィールドを取得）
  const gachaType = await prisma.gachaType.findUnique({
    where: { id: gachaTypeId },
  });

  if (!gachaType) {
    console.error(`ガチャタイプが見つかりません: ${gachaTypeId}`);
    return [];
  }

  const urls: string[] = [];
  let commonVideoIds: number[] = [];
  let rarityVideoIdsObj: Record<string, number[]> | null = null;

  // 動画設定の取得（個別設定 or デフォルト設定）
  if (
    gachaType.useDefaultVideos === false &&
    gachaType.commonVideoIds &&
    gachaType.commonVideoIds.length > 0
  ) {
    // 個別設定を使用
    commonVideoIds = gachaType.commonVideoIds;
    if (gachaType.rarityVideoIds) {
      try {
        rarityVideoIdsObj =
          typeof gachaType.rarityVideoIds === "string"
            ? JSON.parse(gachaType.rarityVideoIds)
            : (gachaType.rarityVideoIds as Record<string, number[]>);
      } catch (error) {
        console.error("等級別動画IDの解析エラー:", error);
      }
    }
  } else {
    // デフォルト設定を使用
    const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (defaultSettings) {
      commonVideoIds = defaultSettings.commonVideoIds || [];
      if (defaultSettings.rarityVideoIds) {
        try {
          rarityVideoIdsObj =
            typeof defaultSettings.rarityVideoIds === "string"
              ? JSON.parse(defaultSettings.rarityVideoIds)
              : (defaultSettings.rarityVideoIds as Record<string, number[]>);
        } catch (error) {
          console.error("デフォルト等級別動画IDの解析エラー:", error);
        }
      }
    }
  }

  // 1. 共通動画を取得
  if (commonVideoIds.length > 0) {
    const commonVideos = await prisma.gachaVideo.findMany({
      where: {
        id: { in: commonVideoIds },
        isActive: true,
      },
    });

    // ランダムで1つ選択
    if (commonVideos.length > 0) {
      const selectedCommonVideo =
        commonVideos[Math.floor(Math.random() * commonVideos.length)];
      urls.push(selectedCommonVideo.s3Url);
    }
  }

  // 2. 等級別動画を取得（あたりの場合のみ）
  if (itemRarity !== RarityEnum.LOSER && rarityVideoIdsObj) {
    const rarityKey = itemRarity as string;
    const rarityVideoIds: number[] = rarityVideoIdsObj[rarityKey] || [];

    if (rarityVideoIds.length > 0) {
      const rarityVideos = await prisma.gachaVideo.findMany({
        where: {
          id: { in: rarityVideoIds },
          isActive: true,
        },
      });

      // ランダムで1つ選択
      if (rarityVideos.length > 0) {
        const selectedRarityVideo =
          rarityVideos[Math.floor(Math.random() * rarityVideos.length)];
        urls.push(selectedRarityVideo.s3Url);
      }
    }
  }

  return urls;
}
