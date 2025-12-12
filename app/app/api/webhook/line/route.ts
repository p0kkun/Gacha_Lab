import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookEvent, TextMessage, MessageEvent, TextEventMessage } from '@line/bot-sdk';
import crypto from 'crypto';

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

// Webhookイベントを処理
async function handleWebhookEvent(
  client: Client,
  event: WebhookEvent
): Promise<void> {
  console.log('イベント処理開始:', {
    eventType: event.type,
    sourceType: event.source?.type,
  });

  // メッセージイベントのみ処理
  if (event.type !== 'message') {
    console.log('メッセージイベントではないためスキップ:', event.type);
    return;
  }

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

  // 管理者用キーワードをチェック
  if (isAdminKeyword(text)) {
    console.log('管理者用キーワードが一致しました');
    const adminUrl = getAdminUrl();
    const replyText = `🔐 管理画面へのアクセスURL:\n\n${adminUrl}\n\n⚠️ このURLは管理者専用です。`;
    
    await replyTextMessage(client, messageEvent.replyToken, replyText);
    console.log(`管理者用URLを返信しました: ${adminUrl}`);
  } else {
    console.log('管理者用キーワードが一致しませんでした');
  }
  // その他のメッセージは無視（必要に応じて自動応答を追加可能）
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
        message: e.type === 'message' && 'message' in e ? (e as any).message?.type : null,
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

