# LINE 公式アカウントに LIFF アプリを表示する方法

## 概要

LINE 公式アカウントから LIFF アプリにアクセスできるようにする方法を説明します。

---

## 方法 1: リッチメニューに設定（推奨）⭐

### リッチメニューとは

- LINE 公式アカウントのトーク画面下部に表示されるメニュー
- **最大 6 個のボタンを配置可能**（8 個は不可）
- 画像とテキストで視覚的に分かりやすい

### ⚠️ 8 個のボタンが必要な場合

**リッチメニューは最大 6 個までです。** 8 個のボタンを実装する場合：

1. **6 個に減らす**（推奨）

   - 重要度の高い 6 個を選ぶ
   - 残り 2 個はアプリ内メニューで提供

2. **2 つのリッチメニューを作成**
   - メインメニュー（6 個）+ サブメニュー（2 個）
   - ユーザーが手動で切り替え

詳細は `リッチメニュー8個ボタン実装方法.md` を参照してください。

### ⚠️ 重要なポイント：リッチメニューと LIFF アプリ内メニューの関係

**リッチメニューと LIFF アプリ内のメニューボタンは別物です：**

- **リッチメニュー**: LINE 公式アカウントのトーク画面下部に表示（LINE アプリ内）
- **LIFF アプリ内メニュー**: LIFF アプリが開かれた時に表示されるメニュー（開発した 8 個のボタンなど）

**連携方法：**

- リッチメニューのボタンから LIFF アプリを開く
- LIFF アプリが開かれたら、そこで開発したメニューボタンが表示される
- URL パラメータを使って、特定のページや機能に直接アクセス可能

### 設定手順

#### 1. リッチメニューの作成

**LINE Official Account Manager での設定：**

1. LINE Official Account Manager にログイン
2. 作成した公式アカウントを選択
3. 「リッチメニュー」→「新規作成」
4. メニュータイプを選択（通常メニュー or コンパクトメニュー）

#### 2. メニュー画像の作成

**推奨サイズ：**

- **通常メニュー**: 2500px × 1686px
- **コンパクトメニュー**: 2500px × 843px

**デザイン例：**

- 「ガチャを引く」ボタン
- 「マイページ」ボタン
- 「友達を招待」ボタン
  など

#### 3. LIFF アプリへのリンク設定

**アクションタイプ：**

- **URI アクション**を選択
- **URI**: LIFF アプリの URL を入力
  ```
  https://liff.line.me/YOUR_LIFF_ID
  ```
- **ラベル**: 「ガチャを引く」「アプリを開く」など

**URL パラメータで特定機能にアクセス：**

リッチメニューの各ボタンから、LIFF アプリの特定のページや機能に直接アクセスできます：

```
# ガチャを引くボタン
https://liff.line.me/YOUR_LIFF_ID?action=gacha

# 抽選履歴ボタン
https://liff.line.me/YOUR_LIFF_ID?action=history

# 友達を招待ボタン
https://liff.line.me/YOUR_LIFF_ID?action=referral
```

これにより、リッチメニューのボタンを押すと、LIFF アプリが開いて該当機能が表示されます。

#### 4. リッチメニューの公開

- 作成したリッチメニューを「公開」に設定
- 友だち追加したユーザーに表示される

---

## 方法 2: メッセージで LIFF アプリのリンクを送信

### 自動応答メッセージに設定

1. LINE Official Account Manager にログイン
2. 「自動応答」→「メッセージ」を設定
3. メッセージ本文に LIFF アプリへのリンクを含める

**メッセージ例：**

```
🎰 ポーカーガチャアプリへようこそ！

ガチャを引いてポーカーイベントのクーポンを獲得しましょう！

👉 アプリを開く
https://liff.line.me/YOUR_LIFF_ID
```

### ボタンテンプレートを使用

```typescript
// Messaging APIで送信する場合
{
  type: 'template',
  altText: 'ポーカーガチャアプリ',
  template: {
    type: 'buttons',
    thumbnailImageUrl: 'https://example.com/app-image.jpg',
    title: 'ポーカーガチャ',
    text: 'ガチャを引いてクーポンを獲得！',
    actions: [
      {
        type: 'uri',
        label: 'アプリを開く',
        uri: 'https://liff.line.me/YOUR_LIFF_ID',
      },
    ],
  },
}
```

---

## 方法 3: プロフィール画面の「Web サイト」リンク

### 設定手順

1. LINE Official Account Manager にログイン
2. 「基本情報」→「Web サイト」を設定
3. **Web サイト名**: 「ポーカーガチャアプリ」
4. **URL**: LIFF アプリの URL
   ```
   https://liff.line.me/YOUR_LIFF_ID
   ```

### 表示場所

- 公式アカウントのプロフィール画面
- 「Web サイト」リンクとして表示される
- ユーザーがタップすると LIFF アプリが開く

---

## 方法 4: メッセージ内の URI アクション

### テキストメッセージ内のリンク

メッセージ本文に LIFF アプリの URL を含めると、自動的にリンクとして認識されます。

**例：**

```
ガチャを引く: https://liff.line.me/YOUR_LIFF_ID
```

---

## 推奨実装方法

### 組み合わせ推奨

1. **リッチメニュー**（メイン）

   - トーク画面下部に常に表示
   - 「ガチャを引く」ボタンを配置

2. **Web サイトリンク**（補助）

   - プロフィール画面からもアクセス可能
   - 基本情報設定で設定

3. **自動応答メッセージ**（初回）
   - 友だち追加時に自動で送信
   - LIFF アプリへのリンクを含める

---

## リッチメニューの実装例（Messaging API 使用）

### リッチメニューを API で作成

```typescript
// lib/line-messaging.ts に追加
import { Client } from "@line/bot-sdk";

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

/**
 * リッチメニューを作成
 */
export async function createRichMenu() {
  const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

  const richMenu = {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: false,
    name: "ガチャメニュー",
    chatBarText: "メニュー",
    areas: [
      {
        bounds: {
          x: 0,
          y: 0,
          width: 833,
          height: 843,
        },
        action: {
          type: "uri",
          uri: liffUrl,
          label: "ガチャを引く",
        },
      },
      {
        bounds: {
          x: 833,
          y: 0,
          width: 833,
          height: 843,
        },
        action: {
          type: "uri",
          uri: `${liffUrl}?page=history`,
          label: "抽選履歴",
        },
      },
      {
        bounds: {
          x: 1666,
          y: 0,
          width: 834,
          height: 843,
        },
        action: {
          type: "uri",
          uri: `${liffUrl}?page=referral`,
          label: "友達を招待",
        },
      },
      // 下段も同様に設定可能
    ],
  };

  try {
    const richMenuId = await client.createRichMenu(richMenu);

    // リッチメニュー画像をアップロード（別途実装が必要）
    // await client.setRichMenuImage(richMenuId, imageBuffer);

    // リッチメニューをデフォルトに設定
    await client.setDefaultRichMenu(richMenuId);

    return { success: true, richMenuId };
  } catch (error) {
    console.error("リッチメニュー作成エラー:", error);
    throw error;
  }
}
```

---

## 注意事項

### LIFF URL の形式

```
https://liff.line.me/YOUR_LIFF_ID
```

または、URL パラメータを含める場合：

```
https://liff.line.me/YOUR_LIFF_ID?ref=REFERRAL_ID
```

### リッチメニューの制限

- 1 つの公式アカウントにつき、最大 1000 個のリッチメニューを作成可能
- 同時に公開できるのは 1 つまで
- 画像サイズの制限あり

### ユーザー体験

- **リッチメニュー**: 最もアクセスしやすい（常に表示）
- **Web サイトリンク**: プロフィール確認時にアクセス可能
- **メッセージ内リンク**: 初回案内などで有効

---

## 実装の流れ

1. **LIFF アプリの URL を確認**

   - LINE Developers Console で LIFF ID を確認
   - LIFF URL を生成

2. **リッチメニューの作成**

   - LINE Official Account Manager で作成
   - または Messaging API で作成

3. **Web サイトリンクの設定**

   - 基本情報設定で Web サイト URL を設定

4. **自動応答メッセージの設定**

   - 友だち追加時に LIFF アプリへのリンクを送信

5. **動作確認**
   - 実際に公式アカウントからアクセスして確認

---

## まとめ

LINE 公式アカウントから LIFF アプリを表示する方法：

1. **リッチメニュー**（推奨）：トーク画面下部に常に表示
2. **Web サイトリンク**：プロフィール画面からアクセス
3. **メッセージ内リンク**：自動応答やプッシュメッセージで送信
4. **ボタンテンプレート**：リッチなメッセージで送信

複数の方法を組み合わせることで、ユーザーがアプリにアクセスしやすくなります。
