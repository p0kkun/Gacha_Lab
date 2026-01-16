import { Client, TextMessage, TemplateMessage, ButtonsTemplate, URIAction } from '@line/bot-sdk';

/**
 * LINE Messaging APIクライアントを取得
 */
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.warn('LINE_CHANNEL_ACCESS_TOKENが設定されていません');
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
    message = message.replace(/{handName}/g, '');
  }

  // 手札とコミュニティカードは使用しない（常に空文字に置換）
  message = message.replace(/{holeCards}/g, '');
  message = message.replace(/{communityCards}/g, '');
  
  // 個別の手札カード変数を空文字に置換
  for (let i = 1; i <= 2; i++) {
    message = message.replace(new RegExp(`\\{holeCard${i}\\}`, 'g'), '');
  }

  // 個別のコミュニティカード変数を空文字に置換
  for (let i = 1; i <= 5; i++) {
    message = message.replace(
      new RegExp(`\\{communityCard${i}\\}`, 'g'),
      ''
    );
  }

  // ポイント付与関連
  if (variables.grantedPoints !== undefined) {
    message = message.replace(/{grantedPoints}/g, String(variables.grantedPoints));
  } else {
    message = message.replace(/{grantedPoints}/g, '0');
  }
  if (variables.grantedPointsMessage !== undefined) {
    message = message.replace(/{grantedPointsMessage}/g, variables.grantedPointsMessage);
  } else {
    // ポイント付与がない場合は空文字に置換
    message = message.replace(/{grantedPointsMessage}/g, '');
  }

  return message;
}

/**
 * 画像URLをフルURLに変換
 */
function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || imageUrl.trim() === '') {
    // デフォルト画像のフルURL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return baseUrl 
      ? `${baseUrl}/images/gacha/default-icon.png`
      : 'https://via.placeholder.com/1024x1024/FF6B6B/FFFFFF?text=GACHA';
  }
  
  // 既にフルURLの場合はそのまま返す
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // 相対パスの場合はフルURLに変換
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return baseUrl ? `${baseUrl}${imageUrl}` : imageUrl;
}

/**
 * LIFF URLを取得
 */
function getLiffUrl(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2008642684-d8jPmggE';
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
      console.error('LINEクライアントの初期化に失敗しました');
      return { success: false, error: 'LINE client initialization failed' };
    }

    // レアリティに応じた絵文字とラベル
    const rarityInfo: Record<string, { emoji: string; label: string }> = {
      FIRST_PRIZE: { emoji: '🏆', label: '1等' },
      SECOND_PRIZE: { emoji: '🥈', label: '2等' },
      THIRD_PRIZE: { emoji: '🥉', label: '3等' },
      FOURTH_PRIZE: { emoji: '🎖️', label: '4等' },
      FIFTH_PRIZE: { emoji: '🎗️', label: '5等' },
      LOSER: { emoji: '💫', label: 'ハズレ' },
    };

    const rarityData = rarityInfo[rarity] || { emoji: '🎁', label: rarity };

    // デフォルトメッセージテンプレート
    const DEFAULT_MESSAGE_TEMPLATE = `🎰 ガチャ結果

{rarityEmoji} {itemName}
レアリティ: {rarity}
ガチャタイプ: {gachaTypeName}

🃏 ポーカーハンド: {handName}
{grantedPointsMessage}

おめでとうございます！🎉`;

    // メッセージ本文を作成
    let messageText: string;

    // ポイント付与メッセージ（付与がある場合のみ）
    const grantedPointsMessage = grantedPoints && grantedPoints > 0
      ? `💰 無償ポイント {grantedPoints}ポイントが付与されました！`
      : '';

    // テンプレートが未設定の場合はデフォルトテンプレートを使用
    const template = messageTemplate || DEFAULT_MESSAGE_TEMPLATE;
    
    messageText = replaceMessageTemplate(template, {
      itemName,
      rarity,
      rarityEmoji: rarityData.emoji,
      rarityLabel: rarityData.label,
      gachaTypeName,
      handName: pokerHand?.handName || '',
      holeCards: pokerHand?.holeCards,
      communityCards: pokerHand?.communityCards,
      grantedPoints: grantedPoints || 0,
      grantedPointsMessage,
    });

    // 画像URLを取得（登録画像があればそれを使用、なければデフォルト画像）
    const thumbnailImageUrl = getFullImageUrl(gachaTypeIconImageUrl);

    // Buttonsテンプレートメッセージを作成
    const buttonsTemplate: ButtonsTemplate = {
      type: 'buttons',
      thumbnailImageUrl: thumbnailImageUrl,
      title: `🎰 ガチャ結果`,
      text: messageText,
      actions: [
        {
          type: 'uri',
          label: 'アプリを開く',
          uri: getLiffUrl(),
        } as URIAction,
      ],
    };

    const templateMessage: TemplateMessage = {
      type: 'template',
      altText: `🎰 ガチャ結果\n\n${rarityData.emoji} ${itemName}\nレアリティ: ${rarityData.label}\nガチャタイプ: ${gachaTypeName}`,
      template: buttonsTemplate,
    };

    await client.pushMessage(userId, [templateMessage]);
    console.log('ガチャ結果メッセージ送信成功:', {
      userId: userId.substring(0, 10) + '...',
      itemName,
      rarity,
    });

    return { success: true };
  } catch (error: any) {
    console.error('ガチャ結果メッセージ送信エラー:', error);

    // エラーの種類に応じて処理
    if (error.statusCode === 404) {
      // ユーザーが友だち追加を解除した
      console.log(`ユーザー ${userId} は友だち追加されていません`);
      return { success: false, error: 'not_following' };
    } else if (error.statusCode === 429) {
      // レート制限
      console.log('レート制限に達しました');
      return { success: false, error: 'rate_limit' };
    } else {
      return { success: false, error: 'unknown' };
    }
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
      console.error('LINEクライアントの初期化に失敗しました');
      return { success: false, error: 'LINE client initialization failed' };
    }

    const message: TextMessage = {
      type: 'text',
      text: messageText,
    };

    await client.pushMessage(userId, [message]);
    console.log('メッセージ送信成功:', {
      userId: userId.substring(0, 10) + '...',
    });

    return { success: true };
  } catch (error: any) {
    console.error('メッセージ送信エラー:', error);

    // エラーの種類に応じて処理
    if (error.statusCode === 404) {
      // ユーザーが友だち追加を解除した
      console.log(`ユーザー ${userId} は友だち追加されていません`);
      return { success: false, error: 'not_following' };
    } else if (error.statusCode === 429) {
      // レート制限
      console.log('レート制限に達しました');
      return { success: false, error: 'rate_limit' };
    } else {
      return { success: false, error: 'unknown' };
    }
  }
}





