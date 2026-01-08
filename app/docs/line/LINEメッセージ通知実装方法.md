# LINE メッセージ通知実装方法

## 概要

商品追加などの通知を LINE メッセージで送信する方法を説明します。

---

## 実装方法

### 1. LINE Messaging API のセットアップ

#### ⚠️ 重要：2024 年 9 月 4 日以降の変更

**2024 年 9 月 4 日以降、LINE Developers コンソールから直接 Messaging API チャネルを作成することはできなくなりました。**

新しい手順：

1. **LINE 公式アカウントを作成**
2. **LINE Official Account Manager から Messaging API を有効化**

#### 必要な準備

1. **LINE 公式アカウントの作成**

   - [LINE Official Account Manager](https://account.line.biz/)にアクセス
   - 新しい LINE 公式アカウントを作成
   - アカウント名、説明、プロフィール画像などを設定

   **📌 複数アカウントの作成について：**

   - **1 つの LINE ビジネス ID につき、最大 100 個まで作成可能**（無料）
   - 店舗やサービスごとにアカウントを分けて運用可能
   - 各アカウントごとに月 200 通まで無料でメッセージ配信可能
   - 複数アカウントを持つことで総配信数を増やすことが可能
   - ただし、管理の複雑化や各アカウントでの友だち集めの手間が増える点に注意

   **⚠️ アカウント名の変更について：**

   - **未認証アカウント**: 変更可能（変更後 7 日間は再度変更不可）
   - **認証済みアカウント**: 原則として変更不可（企業名変更など正当な理由がある場合は再審査で変更可能）
   - アカウント名は慎重に決めることを推奨

2. **Messaging API の有効化**

   - LINE Official Account Manager にログイン
   - 作成した公式アカウントを選択
   - 「設定」→「Messaging API」に移動
   - 「Messaging API を利用する」を有効化
   - これにより、LINE Developers Console に Messaging API チャネルが自動的に作成されます

3. **LINE Developers Console での設定**

   - [LINE Developers Console](https://developers.line.biz/console/)にアクセス
   - 作成された Messaging API チャネルを確認
   - **Channel Access Token を取得**
     - 「Messaging API」タブ → 「チャネルアクセストークン」→「発行」
   - **Channel Secret を確認**
     - 「基本設定」タブ → 「チャネルシークレット」
   - **Webhook URL を設定**（必要に応じて）
     - 「Messaging API」タブ → 「Webhook URL」→「編集」

4. **環境変数の設定**
   ```env
   LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
   LINE_CHANNEL_SECRET=your_channel_secret
   ```

#### 参考リンク

- [LINE Official Account Manager](https://account.line.biz/)
- [LINE Developers Console](https://developers.line.biz/console/)
- [Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)

#### 必要なライブラリ

```bash
npm install @line/bot-sdk
```

---

### 2. プッシュメッセージの送信（サーバー側）

#### 実装例：商品追加通知

```typescript
// lib/line-messaging.ts
import { Client, Message } from "@line/bot-sdk";

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

/**
 * 商品追加通知を送信
 */
export async function sendProductAddedNotification(
  userId: string,
  productName: string,
  productUrl?: string
) {
  try {
    const messages: Message[] = [
      {
        type: "text",
        text: `🎉 新商品が追加されました！\n\n${productName}\n\nガチャを引いて獲得しましょう！`,
      },
    ];

    // URLがある場合はボタンテンプレートを追加
    if (productUrl) {
      messages.push({
        type: "template",
        altText: "新商品の詳細",
        template: {
          type: "buttons",
          thumbnailImageUrl: "https://example.com/product-image.jpg", // 商品画像URL
          title: "新商品追加",
          text: productName,
          actions: [
            {
              type: "uri",
              label: "アプリを開く",
              uri: productUrl,
            },
          ],
        },
      });
    }

    await client.pushMessage(userId, messages);
    return { success: true };
  } catch (error) {
    console.error("LINEメッセージ送信エラー:", error);
    throw error;
  }
}

/**
 * 複数のユーザーに一斉送信（ブロードキャスト）
 */
export async function broadcastProductAddedNotification(
  productName: string,
  productUrl?: string
) {
  try {
    const messages: Message[] = [
      {
        type: "text",
        text: `🎉 新商品が追加されました！\n\n${productName}\n\nガチャを引いて獲得しましょう！`,
      },
    ];

    if (productUrl) {
      messages.push({
        type: "template",
        altText: "新商品の詳細",
        template: {
          type: "buttons",
          thumbnailImageUrl: "https://example.com/product-image.jpg",
          title: "新商品追加",
          text: productName,
          actions: [
            {
              type: "uri",
              label: "アプリを開く",
              uri: productUrl,
            },
          ],
        },
      });
    }

    await client.broadcast(messages);
    return { success: true };
  } catch (error) {
    console.error("LINEブロードキャスト送信エラー:", error);
    throw error;
  }
}
```

---

### 3. API エンドポイントの作成

#### 商品追加時に通知を送信する API

```typescript
// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastProductAddedNotification } from "@/lib/line-messaging";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    // ...

    const body = await request.json();
    const { name, rarity, videoUrl } = body;

    // 商品を追加
    const product = await prisma.gachaItem.create({
      data: {
        name,
        rarity,
        videoUrl,
        isActive: true,
      },
    });

    // 通知を送信（非同期で実行）
    const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL;
    const productUrl = liffUrl ? `${liffUrl}?product=${product.id}` : undefined;

    // 非同期で送信（エラーが発生しても商品追加は成功とする）
    broadcastProductAddedNotification(product.name, productUrl).catch(
      (error) => {
        console.error("通知送信エラー（商品追加は成功）:", error);
      }
    );

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("商品追加エラー:", error);
    return NextResponse.json(
      { error: "商品の追加に失敗しました" },
      { status: 500 }
    );
  }
}
```

---

### 4. ユーザー ID の取得と保存

#### ユーザーがアプリを開いた時にユーザー ID を保存

```typescript
// app/api/users/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, displayName, pictureUrl } = body;

    // ユーザーを登録または更新
    await prisma.user.upsert({
      where: { userId },
      update: {
        displayName,
        pictureUrl,
        updatedAt: new Date(),
      },
      create: {
        userId,
        displayName,
        pictureUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ユーザー登録エラー:", error);
    return NextResponse.json(
      { error: "ユーザー登録に失敗しました" },
      { status: 500 }
    );
  }
}
```

#### クライアント側でユーザー登録

```typescript
// app/page.tsx など
useEffect(() => {
  const registerUser = async () => {
    if (profile) {
      try {
        await fetch("/api/users/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          }),
        });
      } catch (error) {
        console.error("ユーザー登録エラー:", error);
      }
    }
  };

  registerUser();
}, [profile]);
```

---

### 5. 通知送信のタイミング

#### 商品追加時の通知

```typescript
// 管理画面で商品を追加した時
const handleAddProduct = async (productData: ProductData) => {
  // 1. 商品を追加
  const response = await fetch("/api/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  if (response.ok) {
    // 通知はサーバー側で自動送信される
    alert("商品を追加しました。ユーザーに通知を送信しました。");
  }
};
```

#### その他の通知タイミング

```typescript
// lib/line-messaging.ts に追加

/**
 * ガチャ結果通知
 */
export async function sendGachaResultNotification(
  userId: string,
  itemName: string,
  rarity: string
) {
  const rarityEmoji = {
    epic: "💜",
    rare: "💙",
    common: "⚪",
  };

  await client.pushMessage(userId, {
    type: "text",
    text: `🎊 ガチャ結果\n\n${
      rarityEmoji[rarity] || "⚪"
    } ${itemName}\n\nレアリティ: ${rarity}`,
  });
}

/**
 * 友達紹介成立通知
 */
export async function sendReferralCompletedNotification(
  referrerId: string,
  refereeName: string
) {
  await client.pushMessage(referrerId, {
    type: "text",
    text: `🎉 友達紹介が成立しました！\n\n${refereeName}さんがアプリを始めました。\n\n無料ガチャが付与されました！`,
  });
}
```

---

### 6. メッセージテンプレートの種類

#### テキストメッセージ

```typescript
{
  type: 'text',
  text: 'メッセージ内容',
}
```

#### ボタンテンプレート

```typescript
{
  type: 'template',
  altText: '代替テキスト',
  template: {
    type: 'buttons',
    thumbnailImageUrl: 'https://example.com/image.jpg',
    title: 'タイトル',
    text: '本文',
    actions: [
      {
        type: 'uri',
        label: 'アプリを開く',
        uri: 'https://liff.line.me/YOUR_LIFF_ID',
      },
      {
        type: 'postback',
        label: 'アクション',
        data: 'action=open',
      },
    ],
  },
}
```

#### カルーセルテンプレート（複数商品の紹介）

```typescript
{
  type: 'template',
  altText: '新商品一覧',
  template: {
    type: 'carousel',
    columns: [
      {
        thumbnailImageUrl: 'https://example.com/product1.jpg',
        title: '商品1',
        text: '商品1の説明',
        actions: [
          {
            type: 'uri',
            label: '詳細を見る',
            uri: 'https://liff.line.me/YOUR_LIFF_ID?product=1',
          },
        ],
      },
      {
        thumbnailImageUrl: 'https://example.com/product2.jpg',
        title: '商品2',
        text: '商品2の説明',
        actions: [
          {
            type: 'uri',
            label: '詳細を見る',
            uri: 'https://liff.line.me/YOUR_LIFF_ID?product=2',
          },
        ],
      },
    ],
  },
}
```

---

### 7. 通知送信の制限と注意事項

#### 送信制限

- **プッシュメッセージ**: ユーザーが友だち追加または Webhook 経由でメッセージを送信した 24 時間以内のみ送信可能
- **ブロードキャスト**: 月間送信数に制限あり（プランによる）

#### 24 時間制限の回避方法

1. **リプライトークンを使用**

   - Webhook で受信したメッセージにリプライする場合は 24 時間制限なし

2. **通知用アカウントの友だち追加を促す**

   - ユーザーに公式アカウントを友だち追加してもらう
   - 友だち追加後は 24 時間制限なしでプッシュメッセージを送信可能

3. **定期メッセージの活用**
   - LINE 公式アカウントの定期メッセージ機能を使用

#### 実装例：友だち追加チェック

```typescript
// lib/line-messaging.ts
/**
 * ユーザーが友だち追加しているかチェック
 */
export async function checkUserFollowStatus(userId: string): Promise<boolean> {
  try {
    const profile = await client.getProfile(userId);
    // プロフィールが取得できれば友だち追加済み
    return true;
  } catch (error: any) {
    if (error.statusCode === 404) {
      // 友だち追加されていない
      return false;
    }
    throw error;
  }
}

/**
 * 友だち追加を促すメッセージ（24時間以内に送信）
 */
export async function promptFollowNotification(userId: string) {
  await client.pushMessage(userId, {
    type: "text",
    text: "📢 新商品情報やお得な情報をお届けします！\n\n公式アカウントを友だち追加してください 👇",
  });
}
```

---

### 8. エラーハンドリング

```typescript
// lib/line-messaging.ts
export async function sendNotificationSafely(userId: string, message: Message) {
  try {
    await client.pushMessage(userId, message);
    return { success: true };
  } catch (error: any) {
    // エラーの種類に応じて処理
    if (error.statusCode === 404) {
      // ユーザーが友だち追加を解除した
      console.log(`ユーザー ${userId} は友だち追加されていません`);
      return { success: false, reason: "not_following" };
    } else if (error.statusCode === 429) {
      // レート制限
      console.log("レート制限に達しました");
      return { success: false, reason: "rate_limit" };
    } else {
      console.error("通知送信エラー:", error);
      return { success: false, reason: "unknown" };
    }
  }
}
```

---

### 9. 実装の流れ

1. **LINE 公式アカウントの作成** ⭐ 新規手順

   - [LINE Official Account Manager](https://account.line.biz/)で公式アカウントを作成
   - アカウント情報を設定

2. **Messaging API の有効化** ⭐ 新規手順

   - LINE Official Account Manager で Messaging API を有効化
   - これにより LINE Developers Console にチャネルが自動作成される

3. **LINE Developers Console で設定**

   - 作成された Messaging API チャネルを確認
   - Channel Access Token を発行
   - Channel Secret を確認
   - Webhook URL を設定（必要に応じて）

4. **環境変数の設定**

   - `.env.local`にトークンを設定

   ```env
   LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
   LINE_CHANNEL_SECRET=your_channel_secret
   ```

5. **ライブラリのインストール**

   - `@line/bot-sdk`をインストール

   ```bash
   npm install @line/bot-sdk
   ```

6. **通知送信機能の実装**

   - `lib/line-messaging.ts`を作成
   - 各種通知関数を実装

7. **商品追加 API に統合**

   - 商品追加時に通知を送信

8. **ユーザー登録機能の実装**
   - ユーザー ID をデータベースに保存
   - 通知送信可能なユーザーリストを管理

---

## まとめ

LINE メッセージ通知は以下の方法で実現可能：

1. **LINE Messaging API を使用**（サーバー側から送信）
2. **プッシュメッセージ**：個別ユーザーに送信
3. **ブロードキャスト**：全ユーザーに一斉送信
4. **24 時間制限**：友だち追加後は制限なし
5. **リッチメッセージ**：テキスト、ボタン、カルーセルなど

詳細は [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/) を参照してください。
