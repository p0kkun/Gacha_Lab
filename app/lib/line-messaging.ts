import { Client, TextMessage, TemplateMessage } from "@line/bot-sdk";
import { buildLineThumbnailUrl } from "@/lib/line-thumbnail";

type LineApiErrorResponseData = {
  message?: string;
  details?: Array<{
    message?: string;
    property?: string;
  }>;
};

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

function truncateTextForLineButtonsText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // 改行を含む場合でも確実に制限内に収める
  // 改行を保持しつつ、文字列全体を切り詰める
  // 改行文字も1文字としてカウントされるため、単純に切り詰める
  return text.substring(0, Math.max(0, maxLength - 3)) + "...";
}

function truncateTextSingleLine(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const singleLineText = text.replace(/\n/g, " ");
  return singleLineText.substring(0, Math.max(0, maxLength - 3)) + "...";
}

function getLineErrorData(error: unknown): LineApiErrorResponseData | null {
  if (!error || typeof error !== "object") return null;

  // line-bot-sdk throws HTTPError which contains originalError (AxiosError).
  const anyErr = error as {
    originalError?: { response?: { data?: unknown } };
    response?: { data?: unknown };
    data?: unknown;
  };
  const data =
    anyErr.originalError?.response?.data ?? anyErr.response?.data ?? anyErr.data;

  if (!data) return null;
  if (typeof data === "string") return { message: data };
  return data as LineApiErrorResponseData;
}

function summarizeLineButtonsPayload(payload: {
  to: string;
  title: string;
  text: string;
  altText: string;
  thumbnailImageUrl?: string;
  actionUri: string;
}): Record<string, unknown> {
  return {
    toPrefix: payload.to?.substring(0, 10) + "...",
    titleLength: payload.title.length,
    textLength: payload.text.length,
    altTextLength: payload.altText.length,
    hasThumbnailImageUrl: Boolean(payload.thumbnailImageUrl),
    thumbnailImageUrl: payload.thumbnailImageUrl,
    actionUri: payload.actionUri,
  };
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
function getLiffUrl(params?: Record<string, string | null | undefined>): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "2008642684-d8jPmggE";
  const baseUrl = `https://liff.line.me/${liffId}`;
  if (!params) return baseUrl;
  const filtered = Object.entries(params).filter(
    ([, value]) => typeof value === "string" && value.length > 0
  ) as Array<[string, string]>;
  if (filtered.length === 0) return baseUrl;
  return `${baseUrl}?${new URLSearchParams(filtered).toString()}`;
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
  gachaTypeIconImageUrl?: string | null,
  gachaTypeCode?: string | null
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

    const rarityData = tier
      ? { emoji: "", label: tier.label }
      : { emoji: "", label: rarity };

    // ポイント付与メッセージ（付与がある場合のみ）
    const grantedPointsMessage =
      grantedPoints && grantedPoints > 0
      ? `無償ポイント {grantedPoints}ポイントが付与されました！`
        : "";

    // LINE Messaging APIの文字数制限に合わせてテキストを切り詰め
    // title: 最大40文字、text: 最大60文字（改行を含む）、altText: 最大400文字
    // 安全マージンを考慮して55文字に設定
    const MAX_TEXT_LENGTH = 55;
    const MAX_ALT_TEXT_LENGTH = 400;

    // デフォルトメッセージテンプレート（60文字以内に収まる短縮版）
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

    const title = "ガチャ結果"; // 40文字以内なのでそのまま
    const text = truncateTextForLineButtonsText(messageText, MAX_TEXT_LENGTH).trimEnd(); // テンプレ置換後に制限を適用
    const altText = truncateTextSingleLine(
      `ガチャ結果\n\n${rarityData.emoji} ${itemName}\nレアリティ: ${rarityData.label}\nガチャタイプ: ${gachaTypeName}`,
      MAX_ALT_TEXT_LENGTH
    );

    const actionUri = getLiffUrl({
      action: "gacha",
      gacha: gachaTypeCode || "",
    });

    // 画像URL（Buttonsのthumbnailは制約が厳しく400になりやすいので、失敗時は自動で外して再試行する）
    const originalImageUrl = getFullImageUrl(gachaTypeIconImageUrl);
    const thumbnailImageUrl =
      buildLineThumbnailUrl(originalImageUrl) || originalImageUrl;

    const buildTemplateMessage = (includeThumbnail: boolean): TemplateMessage => {
      const buttonsTemplate = {
        type: "buttons" as const,
        ...(includeThumbnail ? { thumbnailImageUrl } : {}),
        title,
        text: text.length > 0 ? text : "ガチャ結果",
        actions: [
          {
            type: "uri" as const,
            label: "このガチャを引く",
            uri: actionUri,
          },
        ],
      };

      return {
        type: "template",
        altText,
        template: buttonsTemplate,
      };
    };

    const payloadSummary = summarizeLineButtonsPayload({
      to: userId,
      title,
      text,
      altText,
      thumbnailImageUrl,
      actionUri,
    });

    try {
      await client.pushMessage(userId, [buildTemplateMessage(true)]);
    } catch (error: unknown) {
      const lineData = getLineErrorData(error);
      console.error("LINE push 失敗（1回目/thumbnailあり）:", {
        ...payloadSummary,
        lineMessage: lineData?.message,
        lineDetails: lineData?.details,
      });

      // thumbnailImageUrl が原因の400が多いので、thumbnail無しで1回だけ再試行
      await client.pushMessage(userId, [buildTemplateMessage(false)]);
      console.warn("LINE push を thumbnail無しで再試行して成功:", payloadSummary);
    }

    console.log("ガチャ結果メッセージ送信成功:", {
      userId: userId.substring(0, 10) + "...",
      itemName,
      rarity,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("ガチャ結果メッセージ送信エラー:", error);

    const lineData = getLineErrorData(error);
    if (lineData) {
      console.error("LINE API error details:", JSON.stringify(lineData));
    }

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
