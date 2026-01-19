import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookEvent, TextMessage, MessageEvent, TextEventMessage, PostbackEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ReferralStatus } from '@prisma/client';

// LINE Messaging APIの型定義（@line/bot-sdkに含まれていない型）
type URIAction = {
  type: 'uri';
  label: string;
  uri: string;
};

type CarouselColumn = {
  thumbnailImageUrl: string;
  title: string;
  text: string;
  actions: URIAction[];
};

type CarouselTemplate = {
  type: 'carousel';
  columns: CarouselColumn[];
};

type TemplateMessage = {
  type: 'template';
  altText: string;
  template: CarouselTemplate;
};

// LINE Messaging APIクライアントの初期化
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.warn('LINE_CHANNEL_ACCESS_TOKENが設定されていません');
    return null;
  }
  return new Client({ channelAccessToken });
}

// Webhook署名の検証
function verifySignature(
  body: string,
  signature: string | null
): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  
  console.log('署名検証開始:', {
    hasChannelSecret: !!channelSecret,
    channelSecretLength: channelSecret?.length || 0,
    hasSignature: !!signature,
    signatureLength: signature?.length || 0,
    bodyLength: body.length,
  });

  if (!channelSecret || !signature) {
    console.error('署名検証失敗: channelSecretまたはsignatureがありません', {
      hasChannelSecret: !!channelSecret,
      hasSignature: !!signature,
    });
    return false;
  }

  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  const isValid = hash === signature;
  
  console.log('署名検証結果:', {
    isValid,
    expectedHash: hash.substring(0, 20) + '...',
    receivedSignature: signature.substring(0, 20) + '...',
  });

  return isValid;
}

// 管理者用キーワードをチェック
function isAdminKeyword(text: string): boolean {
  const adminKeyword = process.env.ADMIN_ACCESS_KEYWORD;
  if (!adminKeyword) {
    console.warn('ADMIN_ACCESS_KEYWORDが設定されていません');
    return false;
  }
  // 大文字小文字を区別せず、前後の空白を無視して比較
  return text.trim().toLowerCase() === adminKeyword.trim().toLowerCase();
}

// 管理画面URLを取得
function getAdminUrl(): string {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (adminUrl) {
    return adminUrl;
  }
  
  // デフォルト: 相対パス
  // 本番環境では、環境変数でフルURLを設定することを推奨
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return baseUrl ? `${baseUrl}/admin` : '/admin';
}

// テキストメッセージに返信
async function replyTextMessage(
  client: Client,
  replyToken: string,
  text: string
): Promise<void> {
  try {
    const message: TextMessage = {
      type: 'text',
      text,
    };
    
    // replyMessageは配列でメッセージを受け取る
    await client.replyMessage(replyToken, [message]);
    console.log('メッセージ送信成功:', { replyToken: replyToken.substring(0, 10) + '...', text: text.substring(0, 50) + '...' });
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: { data?: unknown } };
      console.error('エラー詳細:', JSON.stringify(httpError.response?.data, null, 2));
    }
    throw error;
  }
}

// LIFFアプリのURLを取得
function getLiffUrl(params?: Record<string, string>): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2008642684-d8jPmggE';
  const baseUrl = `https://liff.line.me/${liffId}`;
  
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = new URLSearchParams(params).toString();
  return `${baseUrl}?${queryString}`;
}

// ガチャタイプ一覧を取得
async function getGachaTypes() {
  try {
    const now = new Date();
    const gachaTypes = await prisma.gachaType.findMany({
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
        pointCost: true,
        iconImageUrl: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 10, // カルーセルは最大10個まで
    });
    return gachaTypes;
  } catch (error) {
    console.error('ガチャタイプ取得エラー:', error);
    return [];
  }
}

// ガチャ選択カードメッセージを送信
async function sendGachaSelectionCard(
  client: Client,
  replyToken: string
): Promise<void> {
  try {
    const gachaTypes = await getGachaTypes();
    
    if (gachaTypes.length === 0) {
      await replyTextMessage(
        client,
        replyToken,
        '🎰 現在開催中のガチャはありません。'
      );
      return;
    }

    // 画像URLをフルURLに変換する関数
    const getFullImageUrl = (imageUrl: string | null | undefined): string => {
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
    };

    // カルーセルカラムを作成
    const columns: CarouselColumn[] = gachaTypes.map((gachaType) => {
      const pointCostText = gachaType.pointCost > 0 
        ? `${gachaType.pointCost}P` 
        : '無料';
      
      return {
        thumbnailImageUrl: getFullImageUrl(gachaType.iconImageUrl),
        title: gachaType.name,
        text: `${gachaType.description || ''}\n💰 ${pointCostText}`,
        actions: [
          {
            type: 'uri',
            label: 'このガチャを引く',
            uri: getLiffUrl({
              action: 'gacha',
              gachaTypeId: String(gachaType.id),
            }),
          } as URIAction,
        ],
      };
    });

    // カルーセルテンプレートメッセージを作成
    const carouselTemplate: CarouselTemplate = {
      type: 'carousel',
      columns,
    };

    const templateMessage: TemplateMessage = {
      type: 'template',
      altText: 'ガチャを選択してください',
      template: carouselTemplate,
    };

    await client.replyMessage(replyToken, [templateMessage]);
    console.log('ガチャ選択カードメッセージ送信成功');
  } catch (error) {
    console.error('ガチャ選択カードメッセージ送信エラー:', error);
    await replyTextMessage(
      client,
      replyToken,
      '🎰 ガチャ一覧の取得に失敗しました。しばらくしてから再度お試しください。'
    );
  }
}

// Webhookイベントを処理
async function handleWebhookEvent(
  client: Client,
  event: WebhookEvent
): Promise<void> {
  console.log('イベント処理開始:', {
    eventType: event.type,
    sourceType: event.source?.type,
  });

  // ポストバックイベントを処理（リッチメニューのボタンが押された時）
  if (event.type === 'postback') {
    const postbackEvent = event as PostbackEvent;
    const data = postbackEvent.postback.data;
    
    console.log('ポストバックイベント受信:', {
      data,
      params: postbackEvent.postback.params,
    });

    // リッチメニューのガチャボタンが押された場合
    if (data === 'action=gacha' || data.startsWith('gacha')) {
      await sendGachaSelectionCard(client, postbackEvent.replyToken);
      return;
    }

    // その他のポストバックイベントは無視
    return;
  }

  // メッセージイベントを処理
  if (event.type === 'message') {
    const messageEvent = event as MessageEvent;
    
    if (messageEvent.message.type !== 'text') {
      console.log('テキストメッセージではないためスキップ:', messageEvent.message.type);
      return;
    }

    const textMessage = messageEvent.message as TextEventMessage;
    const text = textMessage.text;

    console.log('受信メッセージ:', {
      text,
      textLength: text.length,
      adminKeyword: process.env.ADMIN_ACCESS_KEYWORD,
    });

    // ガチャ選択のキーワードをチェック（メッセージアクション用）
    const gachaKeywords = ['ガチャ', 'gacha', '🎰', 'ガチャを引く', 'ガチャを選ぶ'];
    const isGachaKeyword = gachaKeywords.some(keyword => 
      text.trim().toLowerCase().includes(keyword.toLowerCase())
    );

    if (isGachaKeyword) {
      console.log('ガチャ選択キーワードが一致しました');
      await sendGachaSelectionCard(client, messageEvent.replyToken);
      return;
    }

    // 管理者用キーワードをチェック
    if (isAdminKeyword(text)) {
      console.log('管理者用キーワードが一致しました');
      const adminUrl = getAdminUrl();
      const replyText = `🔐 管理画面へのアクセスURL:\n\n${adminUrl}\n\n⚠️ このURLは管理者専用です。`;
      
      await replyTextMessage(client, messageEvent.replyToken, replyText);
      console.log(`管理者用URLを返信しました: ${adminUrl}`);
      return;
    }

    // その他のメッセージは無視（必要に応じて自動応答を追加可能）
    return;
  }

  // 友だち追加イベント（follow）を処理
  if (event.type === 'follow') {
    const followEvent = event as FollowEvent;
    const userId = followEvent.source.userId;
    
    if (!userId) {
      console.log('followイベントにuserIdがありません');
      return;
    }

    console.log('友だち追加イベント受信:', { userId });

    try {
      // ユーザープロフィールを取得
      const profile = await client.getProfile(userId);
      
      // ユーザーをDBに登録または更新
      await prisma.user.upsert({
        where: { userId },
        update: {
          displayName: profile.displayName || null,
          pictureUrl: profile.pictureUrl || null,
          updatedAt: new Date(),
        },
        create: {
          userId,
          displayName: profile.displayName || null,
          pictureUrl: profile.pictureUrl || null,
        },
      });

      console.log(`ユーザー登録/更新完了: ${userId}`);

      // 紹介リンクの処理
      // 注意: followイベントにはreferralLinkIdが直接含まれないため、
      // セッションストレージやクッキーから取得する必要がある
      // 簡易実装として、最近アクセスした紹介リンクを検索して処理
      await processReferralOnFollow(userId, client);

      // ウェルカムメッセージを送信
      const welcomeMessage = `ようこそ！🎉\n\nガチャアプリへようこそ！\n\n🎰 ガチャを引いて景品をゲットしよう！\n💰 ポイントを購入してガチャを楽しもう！`;
      await replyTextMessage(client, followEvent.replyToken, welcomeMessage);
    } catch (error) {
      console.error('友だち追加処理エラー:', error);
    }
    return;
  }

  // 友だち解除イベント（unfollow）を処理
  if (event.type === 'unfollow') {
    const unfollowEvent = event as UnfollowEvent;
    const userId = unfollowEvent.source.userId;
    
    if (userId) {
      console.log('友だち解除イベント受信:', { userId });
      // 必要に応じてユーザーステータスを更新
      // （現在は特に処理なし）
    }
    return;
  }

  // その他のイベントタイプは無視
  console.log('未対応のイベントタイプ:', event.type);
}

/**
 * 友だち追加時の紹介処理
 */
async function processReferralOnFollow(refereeId: string, client: Client) {
  try {
    // ユーザー情報を取得（lastAccessedReferralLinkIdを確認）
    const user = await prisma.user.findUnique({
      where: { userId: refereeId },
      select: { lastAccessedReferralLinkId: true, lastAccessedReferralAt: true },
    });

    // lastAccessedReferralLinkIdが存在し、24時間以内にアクセスしている場合のみ処理
    if (!user?.lastAccessedReferralLinkId) {
      console.log('紹介リンクのアクセス履歴がありません:', refereeId);
      return;
    }

    // アクセスから24時間以上経過している場合は無視
    if (user.lastAccessedReferralAt) {
      const hoursSinceAccess = (Date.now() - user.lastAccessedReferralAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceAccess > 24) {
        console.log('紹介リンクのアクセスから24時間以上経過しています:', refereeId);
        return;
      }
    }

    // Referralテーブルから紹介リンクを取得
    const referral = await prisma.referral.findUnique({
      where: { referralLinkId: user.lastAccessedReferralLinkId },
    });

    if (!referral) {
      console.log('紹介リンクが見つかりません:', user.lastAccessedReferralLinkId);
      return;
    }

    // 自己紹介チェック
    if (referral.userId === refereeId) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: ReferralStatus.FRAUD,
        },
      });

      // ReferralHistoryの最新履歴を更新
      const latestHistory = await prisma.referralHistory.findFirst({
        where: {
          referralId: referral.id,
        },
        orderBy: { referredAt: 'desc' },
      });

      if (latestHistory) {
        await prisma.referralHistory.update({
          where: { id: latestHistory.id },
          data: {
            status: ReferralStatus.FRAUD,
            isFraudDetected: true,
            fraudReason: '自己紹介が検出されました',
          },
        });
      }

      console.log('自己紹介が検出されました:', refereeId);
      return;
    }

    // 既に同じ被紹介者で成立済みの紹介がないかチェック（ReferralUserで確認）
    const existingReferralUser = await prisma.referralUser.findFirst({
      where: {
        toUserId: refereeId,
      },
    });

    if (existingReferralUser) {
      // 既に他の紹介者から紹介されている
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: ReferralStatus.INVALID,
        },
      });

      // ReferralHistoryの最新履歴を更新
      const latestHistory = await prisma.referralHistory.findFirst({
        where: {
          referralId: referral.id,
        },
        orderBy: { referredAt: 'desc' },
      });

      if (latestHistory) {
        await prisma.referralHistory.update({
          where: { id: latestHistory.id },
          data: {
            status: ReferralStatus.INVALID,
            fraudReason: '既に他の紹介者から紹介されています',
          },
        });
      }

      console.log('既に他の紹介者から紹介されています:', refereeId);
      return;
    }

    // 紹介成立処理
    const { completeReferral } = await import('@/lib/referral-management');
    await completeReferral(referral.id, refereeId);
    
    // 紹介成立通知を送信
    try {
      await client.pushMessage(referral.userId, {
        type: 'text',
        text: `🎉 友だち紹介が成立しました！\n\n紹介特典として100ポイントを付与しました。\n\n引き続きガチャをお楽しみください！`,
      });
    } catch (error) {
      console.error('紹介成立通知送信エラー:', error);
    }
  } catch (error) {
    console.error('紹介処理エラー:', error);
  }
}


// POST: Webhookリクエストを受信
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得（署名検証のため、文字列として取得）
    const body = await request.text();
    
    console.log('Webhook受信:', {
      bodyLength: body.length,
      bodyPreview: body.substring(0, 200),
      headers: {
        'x-line-signature': request.headers.get('x-line-signature')?.substring(0, 20) + '...',
        'content-type': request.headers.get('content-type'),
      },
    });
    
    // 署名を検証
    const signature = request.headers.get('x-line-signature');
    if (!verifySignature(body, signature)) {
      console.error('Webhook署名の検証に失敗しました');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    console.log('署名検証成功、イベント処理を開始します');

    // JSONをパース
    const parsedBody = JSON.parse(body);
    const events: WebhookEvent[] = parsedBody.events || [];
    
    console.log('イベント解析:', {
      eventCount: events.length,
      events: events.map((e) => ({
        type: e.type,
        source: e.source?.type,
        message: e.type === 'message' && 'message' in e ? (e as { message?: { type?: string } }).message?.type : null,
      })),
    });

    // LINEクライアントを取得
    const client = getLineClient();
    if (!client) {
      console.error('LINEクライアントの初期化に失敗しました');
      return NextResponse.json(
        { error: 'LINE client initialization failed' },
        { status: 500 }
      );
    }

    // 各イベントを処理
    const promises = events.map((event) => handleWebhookEvent(client, event));
    await Promise.all(promises);

    console.log('Webhook処理完了');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Webhook検証用（LINE Developers ConsoleでWebhook URLを設定する際に必要）
export async function GET() {
  return NextResponse.json({
    message: 'LINE Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

