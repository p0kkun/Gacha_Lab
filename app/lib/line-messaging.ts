import { Client, TextMessage } from '@line/bot-sdk';

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
 * ガチャ結果をLINEトークに送信
 */
export async function sendGachaResultMessage(
  userId: string,
  itemName: string,
  rarity: string,
  gachaTypeName: string,
  pokerHand?: {
    handName: string;
    holeCards: Array<{ suit: string; rank: string }>;
    communityCards: Array<{ suit: string; rank: string }>;
  }
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

    // メッセージ本文を作成
    let messageText = `🎰 ガチャ結果\n\n`;
    messageText += `${rarityData.emoji} ${itemName}\n`;
    messageText += `レアリティ: ${rarityData.label}\n`;
    messageText += `ガチャタイプ: ${gachaTypeName}\n\n`;

    // ポーカーハンドがある場合は追加情報
    if (pokerHand) {
      messageText += `🃏 ポーカーハンド: ${pokerHand.handName}\n\n`;
      messageText += `手札:\n`;
      pokerHand.holeCards.forEach((card, index) => {
        messageText += `  ${index + 1}. ${card.rank}${card.suit}\n`;
      });
      messageText += `\nコミュニティカード:\n`;
      pokerHand.communityCards.forEach((card, index) => {
        messageText += `  ${index + 1}. ${card.rank}${card.suit}\n`;
      });
    }

    messageText += `\nおめでとうございます！🎉`;

    const message: TextMessage = {
      type: 'text',
      text: messageText,
    };

    await client.pushMessage(userId, [message]);
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

