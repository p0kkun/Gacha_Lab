import { prisma } from "@/lib/prisma";
import { getVideoUrl } from "@/lib/s3-upload";

/**
 * ガチャタイプの動画設定に基づいて動画を選択
 * 優先順位: 個別設定 > デフォルト設定
 * @param gachaTypeId ガチャタイプID
 * @param itemRarity アイテムのレアリティ
 * @returns 動画URLの配列（共通動画 → 等級別動画の順）
 */
export async function getGachaVideoUrls(
  gachaTypeCode: string,
  itemRarity: string
): Promise<string[]> {
  // ガチャタイプを取得（全フィールドを取得）
  const gachaType = await prisma.gachaType.findUnique({
    where: { code: gachaTypeCode },
  });

  if (!gachaType) {
    console.error(`ガチャタイプが見つかりません: ${gachaTypeCode}`);
    return [];
  }

  const urls: string[] = [];
  // let commonVideoAssetIds: number[] = []; // 共通動画は使用しないためコメントアウト
  let tierVideoAssetIdsObj: Record<string, number[]> | null = null;

  // 動画設定の取得（個別設定 or デフォルト設定）
  if (
    gachaType.useDefaultVideos === false &&
    (gachaType as any).tierVideoAssetIds
  ) {
    // 個別設定を使用
    console.log(`[動画選択] ガチャタイプ ${gachaTypeCode}: 個別設定を使用`);
    // commonVideoAssetIds = (gachaType as any).commonVideoAssetIds; // 共通動画は使用しないためコメントアウト
    if ((gachaType as any).tierVideoAssetIds) {
      try {
        tierVideoAssetIdsObj =
          typeof (gachaType as any).tierVideoAssetIds === "string"
            ? JSON.parse((gachaType as any).tierVideoAssetIds)
            : ((gachaType as any).tierVideoAssetIds as Record<string, number[]>);
      } catch (error) {
        console.error("等級別動画IDの解析エラー:", error);
      }
    }
  } else {
    // デフォルト設定を使用
    console.log(
      `[動画選択] ガチャタイプ ${gachaTypeCode}: デフォルト設定を使用 (useDefaultVideos=${
        gachaType.useDefaultVideos
      })`
    );
    const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (defaultSettings) {
      // commonVideoAssetIds = (defaultSettings as any).commonVideoAssetIds || []; // 共通動画は使用しないためコメントアウト
      if ((defaultSettings as any).tierVideoAssetIds) {
        try {
          tierVideoAssetIdsObj =
            typeof (defaultSettings as any).tierVideoAssetIds === "string"
              ? JSON.parse((defaultSettings as any).tierVideoAssetIds)
              : ((defaultSettings as any).tierVideoAssetIds as Record<
                  string,
                  number[]
                >);
        } catch (error) {
          console.error("デフォルト等級別動画IDの解析エラー:", error);
        }
      }
      console.log(
        `[動画選択] デフォルト設定: 等級別動画設定${
          tierVideoAssetIdsObj ? Object.keys(tierVideoAssetIdsObj).length : 0
        }等級`
      );
      console.log(
        `[動画選択] デフォルト設定詳細: tierVideoAssetIds=${JSON.stringify(tierVideoAssetIdsObj)}`
      );
    } else {
      console.warn(
        `[動画選択] ガチャタイプ ${gachaTypeCode}: デフォルト設定が見つかりません`
      );
      console.warn(
        `[動画選択] デフォルト設定テーブルを確認してください。管理画面で一括設定を保存してください。`
      );
    }
  }

  // 1. 共通動画を取得（共通動画は使用しないためコメントアウト）
  // if (commonVideoAssetIds.length > 0) {
  //   const commonVideos = await prisma.videoAsset.findMany({
  //     where: {
  //       id: { in: commonVideoAssetIds },
  //       isActive: true,
  //     },
  //   });

  //   console.log(
  //     `[動画選択] 共通動画: ID${commonVideoAssetIds.join(",")}から${
  //       commonVideos.length
  //     }件取得`
  //   );

  //   // ランダムで1つ選択
  //   if (commonVideos.length > 0) {
  //     const selectedCommonVideo =
  //       commonVideos[Math.floor(Math.random() * commonVideos.length)];
  //     urls.push(getVideoUrl(selectedCommonVideo.s3Key));
  //     console.log(
  //       `[動画選択] 共通動画選択: ${selectedCommonVideo.fileName} (${getVideoUrl(
  //         selectedCommonVideo.s3Key
  //       )})`
  //     );
  //   } else {
  //     console.warn(
  //       `[動画選択] 共通動画が見つかりません (ID: ${commonVideoAssetIds.join(
  //         ","
  //       )})`
  //     );
  //   }
  // } else {
  //   console.warn(`[動画選択] 共通動画IDが設定されていません`);
  // }

  // 2. 等級別動画を取得（ハズレを含むすべてのレアリティ）
  if (tierVideoAssetIdsObj) {
    const rarityKey = itemRarity as string;
    const rarityVideoIds: number[] = tierVideoAssetIdsObj[rarityKey] || [];

    console.log(
      `[動画選択] 等級別動画 (${rarityKey}): ID${
        rarityVideoIds.join(",") || "なし"
      }`
    );

    if (rarityVideoIds.length > 0) {
      const rarityVideos = await prisma.videoAsset.findMany({
        where: {
          id: { in: rarityVideoIds },
          isActive: true,
        },
      });

      // ランダムで1つ選択
      if (rarityVideos.length > 0) {
        const selectedRarityVideo =
          rarityVideos[Math.floor(Math.random() * rarityVideos.length)];
        urls.push(getVideoUrl(selectedRarityVideo.s3Key));
        console.log(
          `[動画選択] 等級別動画選択: ${selectedRarityVideo.fileName} (${getVideoUrl(
            selectedRarityVideo.s3Key
          )})`
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
