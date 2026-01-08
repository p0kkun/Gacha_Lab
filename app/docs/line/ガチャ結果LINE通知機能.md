# ガチャ結果LINE通知機能

## 概要

ガチャを引いた結果をLINEトークに自動送信する機能を実装しました。

---

## 機能説明

### 実装内容

1. **ガチャ実行時に自動通知**
   - ガチャを引いた結果（アイテム名、レアリティ、ポーカーハンド情報）をLINEトークに送信
   - ガチャ結果の取得に失敗しても、LINEメッセージ送信のエラーはガチャ結果に影響しない

2. **メッセージ内容**
   - アイテム名
   - レアリティ（1等〜5等、ハズレ）
   - ガチャタイプ名
   - ポーカーハンド情報（通常ガチャの場合）
     - 役名
     - 手札（2枚）
     - コミュニティカード（5枚）

---

## 実装ファイル

### 1. LINE Messaging APIユーティリティ

**ファイル**: `lib/line-messaging.ts`

```typescript
import { Client, TextMessage } from '@line/bot-sdk';

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
): Promise<{ success: boolean; error?: string }>
```

**機能**:
- LINE Messaging APIを使用してプッシュメッセージを送信
- レアリティに応じた絵文字とラベルを自動設定
- ポーカーハンド情報がある場合は詳細を追加
- エラーハンドリング（友だち追加解除、レート制限など）

### 2. ガチャ実行API

**ファイル**: `app/api/gacha/route.ts`

**変更点**:
- ガチャ結果を取得した後、`sendGachaResultMessage`を呼び出し
- LINEメッセージ送信のエラーはログに記録するが、ガチャ結果には影響しない

```typescript
// ガチャ結果をLINEトークに送信（非同期、エラーが発生してもガチャ結果は返す）
sendGachaResultMessage(
  userId,
  selectedItem.name,
  selectedItem.rarity,
  gachaType.name,
  pokerHand ? {
    handName: pokerHand.handName,
    holeCards: pokerHand.holeCards.map((card) => ({
      suit: card.suit,
      rank: card.rank,
    })),
    communityCards: pokerHand.communityCards.map((card) => ({
      suit: card.suit,
      rank: card.rank,
    })),
  } : undefined
).catch((error) => {
  // LINEメッセージ送信のエラーはログに記録するが、ガチャ結果には影響しない
  console.error('LINEメッセージ送信エラー（ガチャ結果は正常）:', error);
});
```

---

## メッセージフォーマット

### 通常ガチャ（ポーカーハンドあり）

```
🎰 ガチャ結果

🏆 1等アイテム (通常)
レアリティ: 1等
ガチャタイプ: 通常ガチャ

🃏 ポーカーハンド: ロイヤルフラッシュ

手札:
  1. A♠
  2. K♠

コミュニティカード:
  1. Q♠
  2. J♠
  3. 10♠
  4. 9♠
  5. 8♠

おめでとうございます！🎉
```

### プレミアムガチャ（ポーカーハンドなし）

```
🎰 ガチャ結果

💫 ハズレアイテム (プレミアム)
レアリティ: ハズレ
ガチャタイプ: プレミアムガチャ

おめでとうございます！🎉
```

---

## レアリティ表示

| レアリティ | 絵文字 | ラベル |
|-----------|--------|--------|
| FIRST_PRIZE | 🏆 | 1等 |
| SECOND_PRIZE | 🥈 | 2等 |
| THIRD_PRIZE | 🥉 | 3等 |
| FOURTH_PRIZE | 🎖️ | 4等 |
| FIFTH_PRIZE | 🎗️ | 5等 |
| LOSER | 💫 | ハズレ |

---

## エラーハンドリング

### エラー種類

1. **友だち追加解除** (`not_following`)
   - ユーザーがLINE公式アカウントの友だち追加を解除した場合
   - エラーはログに記録されるが、ガチャ結果には影響しない

2. **レート制限** (`rate_limit`)
   - LINE Messaging APIのレート制限に達した場合
   - エラーはログに記録されるが、ガチャ結果には影響しない

3. **その他のエラー** (`unknown`)
   - 予期しないエラーが発生した場合
   - エラーはログに記録されるが、ガチャ結果には影響しない

### ログ出力

```typescript
// 成功時
console.log('ガチャ結果メッセージ送信成功:', {
  userId: userId.substring(0, 10) + '...',
  itemName,
  rarity,
});

// エラー時
console.error('ガチャ結果メッセージ送信エラー:', error);
console.log(`ユーザー ${userId} は友だち追加されていません`);
console.log('レート制限に達しました');
```

---

## 必要な環境変数

### LINE Messaging API

```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

### 設定方法

1. [LINE Developers Console](https://developers.line.biz/console/)にアクセス
2. Messaging APIチャネルを選択
3. 「Messaging API」タブ → 「チャネルアクセストークン」→「発行」
4. 発行されたトークンを環境変数に設定

---

## 動作確認

### 1. ガチャ実行

1. LIFFアプリでガチャを実行
2. ガチャ結果が表示される
3. LINE公式アカウントのトークに通知が届く

### 2. メッセージ確認

- LINE公式アカウントのトークを確認
- ガチャ結果がメッセージとして表示される

### 3. エラー確認

- サーバーログを確認
- LINEメッセージ送信のエラーがログに記録されているか確認

---

## 注意事項

### 1. 友だち追加が必要

- ユーザーがLINE公式アカウントの友だち追加を解除した場合、メッセージは送信されません
- エラーはログに記録されますが、ガチャ結果には影響しません

### 2. レート制限

- LINE Messaging APIにはレート制限があります
- レート制限に達した場合、メッセージは送信されません
- エラーはログに記録されますが、ガチャ結果には影響しません

### 3. 非同期処理

- LINEメッセージ送信は非同期で実行されます
- ガチャ結果のレスポンスは、LINEメッセージ送信の完了を待ちません
- メッセージ送信のエラーが発生しても、ガチャ結果は正常に返されます

---

## トラブルシューティング

### メッセージが届かない

1. **環境変数の確認**
   - `LINE_CHANNEL_ACCESS_TOKEN`が正しく設定されているか確認
   - `LINE_CHANNEL_SECRET`が正しく設定されているか確認

2. **友だち追加の確認**
   - ユーザーがLINE公式アカウントの友だち追加を解除していないか確認
   - サーバーログで`not_following`エラーが記録されていないか確認

3. **レート制限の確認**
   - サーバーログで`rate_limit`エラーが記録されていないか確認
   - LINE Messaging APIのレート制限を確認

4. **サーバーログの確認**
   - サーバーログでLINEメッセージ送信のエラーが記録されていないか確認
   - エラーメッセージの内容を確認

### メッセージの内容が正しくない

1. **ガチャ結果の確認**
   - ガチャ結果が正しく取得されているか確認
   - アイテム名、レアリティ、ポーカーハンド情報が正しいか確認

2. **メッセージフォーマットの確認**
   - `lib/line-messaging.ts`のメッセージフォーマットを確認
   - レアリティの絵文字とラベルが正しく設定されているか確認

---

## 今後の拡張

### 1. メッセージテンプレートのカスタマイズ

- メッセージのフォーマットをカスタマイズ可能にする
- 管理者画面からメッセージテンプレートを編集できるようにする

### 2. 画像の追加

- 獲得したアイテムの画像をメッセージに追加
- ポーカーハンドの画像をメッセージに追加

### 3. ボタンテンプレートの追加

- 「アプリを開く」ボタンを追加
- 「ガチャ履歴を見る」ボタンを追加

### 4. 通知のON/OFF設定

- ユーザーが通知のON/OFFを設定できるようにする
- 管理者画面から通知のON/OFFを設定できるようにする

---

## 参考資料

- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [LINE Messaging API SDK for Node.js](https://github.com/line/line-bot-sdk-nodejs)
- [プッシュメッセージの送信](https://developers.line.biz/ja/docs/messaging-api/sending-messages/#push-message)





