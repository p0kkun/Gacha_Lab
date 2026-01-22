import { Client, TextMessage, TemplateMessage } from "@line/bot-sdk";

/**
 * LINE Messaging APIクライアントを取得
 */
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.warn("LINE_CHANNEL_ACCESS_TOKENが設定されていません");
    return null;
  }
  return new Client({ channelAccessToken });
}

/**
 * ガチャ結果メッセージテンプレートの変数を置換
 */
function replaceMessageTemplate(
  template: string,
  variables: {
    itemName: string;
    rarity: string;
    rarityEmoji: string;
    rarityLabel: string;
    gachaTypeName: string;
    handName?: string;
    holeCards?: Array<{ suit: string; rank: string }>;
    communityCards?: Array<{ suit: string; rank: string }>;
    grantedPoints?: number;
    grantedPointsMessage?: string;
  }
): string {
  let message = template;

  // 基本変数
  message = message.replace(/{itemName}/g, variables.itemName);
  message = message.replace(/{rarity}/g, variables.rarityLabel);
  message = message.replace(/{rarityEmoji}/g, variables.rarityEmoji);
  message = message.replace(/{gachaTypeName}/g, variables.gachaTypeName);

  // ポーカーハンド関連（役が設定されている場合のみ）
  if (variables.handName) {
    message = message.replace(/{handName}/g, variables.handName);
  } else {
    // 役が設定されていない場合は、役関連の変数を空文字に置換
    message = message.replace(/{handName}/g, "");
  }

  // 手札とコミュニティカードは使用しない（常に空文字に置換）
  message = message.replace(/{holeCards}/g, "");
  message = message.replace(/{communityCards}/g, "");
  
  // 個別の手札カード変数を空文字に置換
  for (let i = 1; i <= 2; i++) {
    message = message.replace(new RegExp(`\\{holeCard${i}\\}`, "g"), "");
  }

  // 個別のコミュニティカード変数を空文字に置換
  for (let i = 1; i <= 5; i++) {
    message = message.replace(new RegExp(`\\{communityCard${i}\\}`, "g"), "");
  }

  // ポイント付与関連
  if (variables.grantedPoints !== undefined) {
    message = message.replace(
      /{grantedPoints}/g,
      String(variables.grantedPoints)
    );
  } else {
    message = message.replace(/{grantedPoints}/g, "0");
  }
  if (variables.grantedPointsMessage !== undefined) {
    message = message.replace(
      /{grantedPointsMessage}/g,
      variables.grantedPointsMessage
    );
  } else {
    // ポイント付与がない場合は空文字に置換
    message = message.replace(/{grantedPointsMessage}/g, "");
  }

  return message;
}

/**
 * 画像URLをフルURLに変換
 */
function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || imageUrl.trim() === "") {
    // デフォルト画像のフルURL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    return baseUrl 
      ? `${baseUrl}/images/gacha/default-icon.png`
      : "https://via.placeholder.com/1024x1024/FF6B6B/FFFFFF?text=GACHA";
  }
  
  // 既にフルURLの場合はそのまま返す
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  
  // 相対パスの場合はフルURLに変換
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return baseUrl ? `${baseUrl}${imageUrl}` : imageUrl;
}

/**
 * LIFF URLを取得
 */
function getLiffUrl(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "2008642684-d8jPmggE";
  return `https://liff.line.me/${liffId}`;
}

/**
 * ガチャ結果をLINEトークに送信（カード形式）
 */
export async function sendGachaResultMessage(
  userId: string,
  itemName: string,
  rarity: string,
  gachaTypeName: string,
  messageTemplate?: string | null,
  pokerHand?: {
    handName: string;
    holeCards: Array<{ suit: string; rank: string }>;
    communityCards: Array<{ suit: string; rank: string }>;
  },
  grantedPoints?: number,
  gachaTypeIconImageUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getLineClient();
    if (!client) {
      console.error("LINEクライアントの初期化に失敗しました");
      return { success: false, error: "LINE client initialization failed" };
    }

    // レアリティに応じた絵文字とラベルをPrizeTierテーブルから取得
    const { prisma } = await import("@/lib/prisma");
    const tier = await prisma.prizeTier.findUnique({
      where: { code: rarity },
      select: { label: true },
    });

    // 絵文字はコード内でマッピング（DBに保存する必要はない）
    const emojiMap: Record<string, string> = {
      FIRST_PRIZE: "🏆",
      SECOND_PRIZE: "🥈",
      THIRD_PRIZE: "🥉",
      FOURTH_PRIZE: "🎖️",
      FIFTH_PRIZE: "🎗️",
      LOSER: "💫",
    };

    const rarityData = tier
      ? { emoji: emojiMap[rarity] || "🎁", label: tier.label }
      : { emoji: emojiMap[rarity] || "🎁", label: rarity };

    // ポイント付与メッセージ（付与がある場合のみ）
    const grantedPointsMessage =
      grantedPoints && grantedPoints > 0
      ? `💰 無償ポイント {grantedPoints}ポイントが付与されました！`
        : "";

    // LINE Messaging APIの文字数制限に合わせてテキストを切り詰め
    // title: 最大40文字、text: 最大120文字（改行を含む）、altText: 最大400文字
    const MAX_TEXT_LENGTH = 120;
    const MAX_ALT_TEXT_LENGTH = 400;

    // デフォルトメッセージテンプレート（120文字以内に収まる短縮版）
    const DEFAULT_MESSAGE_TEMPLATE = `{rarityEmoji} {itemName}
レアリティ: {rarity}
{grantedPointsMessage}`;

    // テンプレートが未設定の場合はデフォルトテンプレートを使用
    const template = messageTemplate || DEFAULT_MESSAGE_TEMPLATE;
    
    // テンプレートからメッセージ本文を生成
    const messageText = replaceMessageTemplate(template, {
      itemName,
      rarity,
      rarityEmoji: rarityData.emoji,
      rarityLabel: rarityData.label,
      gachaTypeName,
      handName: pokerHand?.handName || "",
      holeCards: pokerHand?.holeCards,
      communityCards: pokerHand?.communityCards,
      grantedPoints: grantedPoints || 0,
      grantedPointsMessage,
    });

    // テキストを120文字以内に収める関数
    const truncateTextForLine = (text: string, maxLength: number): string => {
      // 改行を含めた実際の文字数でカウント
      if (text.length <= maxLength) return text;

      // 改行で分割して、各行を確認しながら切り詰め
      const lines = text.split("\n");
      let result = "";
      for (const line of lines) {
        const newResult = result ? `${result}\n${line}` : line;
        if (newResult.length <= maxLength) {
          result = newResult;
        } else {
          // 追加すると超過する場合は、改行をスペースに変換してから切り詰め
          const singleLine = result ? `${result} ${line}` : line;
          if (singleLine.length > maxLength) {
            return singleLine.substring(0, maxLength - 3) + "...";
          }
          result = singleLine;
        }
      }
      return result;
    };

    // altText用の関数（400文字制限）
    const truncateText = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text;
      const singleLineText = text.replace(/\n/g, " ");
      return singleLineText.substring(0, maxLength - 3) + "...";
    };

    const title = "🎰 ガチャ結果"; // 40文字以内なのでそのまま
    const text = truncateTextForLine(messageText, MAX_TEXT_LENGTH); // 管理画面のテンプレートから生成し、120文字以内に収める
    const altText = truncateText(
      `🎰 ガチャ結果\n\n${rarityData.emoji} ${itemName}\nレアリティ: ${rarityData.label}\nガチャタイプ: ${gachaTypeName}`,
      MAX_ALT_TEXT_LENGTH
    );

    // 画像URLを取得（登録画像があればそれを使用、なければデフォルト画像）
    const thumbnailImageUrl = getFullImageUrl(gachaTypeIconImageUrl);

    // Buttonsテンプレートメッセージを作成
    const buttonsTemplate = {
      type: "buttons" as const,
      thumbnailImageUrl: thumbnailImageUrl,
      title: title,
      text: text,
      actions: [
        {
          type: "uri" as const,
          label: "アプリを開く",
          uri: getLiffUrl(),
        },
      ],
    };

    const templateMessage: TemplateMessage = {
      type: "template",
      altText: altText,
      template: buttonsTemplate,
    };

    await client.pushMessage(userId, [templateMessage]);
    console.log("ガチャ結果メッセージ送信成功:", {
      userId: userId.substring(0, 10) + "...",
      itemName,
      rarity,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("ガチャ結果メッセージ送信エラー:", error);

    // エラーの種類に応じて処理
    if (error && typeof error === "object" && "statusCode" in error) {
      const httpError = error as { statusCode: number };
      if (httpError.statusCode === 404) {
      // ユーザーが友だち追加を解除した
      console.log(`ユーザー ${userId} は友だち追加されていません`);
        return { success: false, error: "not_following" };
      } else if (httpError.statusCode === 429) {
      // レート制限
        console.log("レート制限に達しました");
        return { success: false, error: "rate_limit" };
      }
    }
    return { success: false, error: "unknown" };
  }
}

/**
 * 汎用メッセージ送信関数
 */
export async function sendMessage(
  userId: string,
  messageText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getLineClient();
    if (!client) {
      console.error("LINEクライアントの初期化に失敗しました");
      return { success: false, error: "LINE client initialization failed" };
    }

    const message: TextMessage = {
      type: "text",
      text: messageText,
    };

    await client.pushMessage(userId, [message]);
    console.log("メッセージ送信成功:", {
      userId: userId.substring(0, 10) + "...",
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("メッセージ送信エラー:", error);

    // エラーの種類に応じて処理
    if (error && typeof error === "object" && "statusCode" in error) {
      const httpError = error as { statusCode: number };
      if (httpError.statusCode === 404) {
      // ユーザーが友だち追加を解除した
      console.log(`ユーザー ${userId} は友だち追加されていません`);
        return { success: false, error: "not_following" };
      } else if (httpError.statusCode === 429) {
      // レート制限
        console.log("レート制限に達しました");
        return { success: false, error: "rate_limit" };
      }
    }
    return { success: false, error: "unknown" };
    }
  }
