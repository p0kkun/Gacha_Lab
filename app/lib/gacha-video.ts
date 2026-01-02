import { prisma } from "@/lib/prisma";
import type { Rarity } from ".prisma/client";

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
    console.log(`[動画選択] ガチャタイプ ${gachaTypeId}: 個別設定を使用`);
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
    console.log(
      `[動画選択] ガチャタイプ ${gachaTypeId}: デフォルト設定を使用 (useDefaultVideos=${
        gachaType.useDefaultVideos
      }, commonVideoIds.length=${gachaType.commonVideoIds?.length || 0})`
    );
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
      console.log(
        `[動画選択] デフォルト設定: 共通動画${
          commonVideoIds.length
        }件, 等級別動画設定${
          rarityVideoIdsObj ? Object.keys(rarityVideoIdsObj).length : 0
        }等級`
      );
      console.log(
        `[動画選択] デフォルト設定詳細: commonVideoIds=[${commonVideoIds.join(
          ","
        )}], rarityVideoIds=${JSON.stringify(rarityVideoIdsObj)}`
      );
    } else {
      console.warn(
        `[動画選択] ガチャタイプ ${gachaTypeId}: デフォルト設定が見つかりません`
      );
      console.warn(
        `[動画選択] デフォルト設定テーブルを確認してください。管理画面で一括設定を保存してください。`
      );
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

    console.log(
      `[動画選択] 共通動画: ID${commonVideoIds.join(",")}から${
        commonVideos.length
      }件取得`
    );

    // ランダムで1つ選択
    if (commonVideos.length > 0) {
      const selectedCommonVideo =
        commonVideos[Math.floor(Math.random() * commonVideos.length)];
      urls.push(selectedCommonVideo.s3Url);
      console.log(
        `[動画選択] 共通動画選択: ${selectedCommonVideo.fileName} (${selectedCommonVideo.s3Url})`
      );
    } else {
      console.warn(
        `[動画選択] 共通動画が見つかりません (ID: ${commonVideoIds.join(",")})`
      );
    }
  } else {
    console.warn(`[動画選択] 共通動画IDが設定されていません`);
  }

  // 2. 等級別動画を取得（ハズレを含むすべてのレアリティ）
  if (rarityVideoIdsObj) {
    const rarityKey = itemRarity as string;
    const rarityVideoIds: number[] = rarityVideoIdsObj[rarityKey] || [];

    console.log(
      `[動画選択] 等級別動画 (${rarityKey}): ID${
        rarityVideoIds.join(",") || "なし"
      }`
    );

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
        console.log(
          `[動画選択] 等級別動画選択: ${selectedRarityVideo.fileName} (${selectedRarityVideo.s3Url})`
        );
      } else {
        console.warn(
          `[動画選択] 等級別動画が見つかりません (${rarityKey}, ID: ${rarityVideoIds.join(
            ","
          )})`
        );
      }
    } else {
      console.warn(
        `[動画選択] 等級別動画IDが設定されていません (${rarityKey})`
      );
    }
  } else {
    console.warn(`[動画選択] 等級別動画設定がありません`);
  }

  console.log(`[動画選択] 最終的な動画URL数: ${urls.length}件`);
  return urls;
}
