# LINE公式アカウントから管理画面URL取得機能

## 概要

LINE公式アカウントに特定のキーワードを送信すると、管理画面へのURLを返信する機能です。

管理者が管理画面のURLを覚える必要がなくなり、LINE公式アカウントから簡単にアクセスできます。

---

## 🎯 機能説明

### 動作フロー

1. **ユーザーがLINE公式アカウントにメッセージを送信**
   - 管理者用キーワード（例: `admin2024secret`）を送信

2. **Webhookエンドポイントがメッセージを受信**
   - `/api/webhook/line` がLINE Messaging APIからWebhookリクエストを受信

3. **キーワードをチェック**
   - 送信されたメッセージが管理者用キーワードと一致するか確認

4. **管理画面URLを返信**
   - キーワードが一致した場合、管理画面のURLを返信

5. **ユーザーがURLをクリック**
   - 返信されたURLをブラウザで開いて管理画面にアクセス

---

## 🔧 実装内容

### Webhookエンドポイント

**パス**: `/api/webhook/line`

**実装ファイル**: `app/api/webhook/line/route.ts`

### 主な機能

1. **Webhook署名の検証**
   - LINE Messaging APIからのリクエストであることを確認
   - `LINE_CHANNEL_SECRET` を使用して署名を検証

2. **メッセージイベントの処理**
   - テキストメッセージのみ処理
   - 管理者用キーワードをチェック

3. **管理画面URLの返信**
   - キーワードが一致した場合、管理画面URLを返信

---

## 📋 必要な環境変数

### 必須環境変数

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIのチャネルアクセストークン | `xxxxxxxxxxxxx` |
| `LINE_CHANNEL_SECRET` | LINE Messaging APIのチャネルシークレット | `xxxxxxxxxxxxx` |
| `ADMIN_ACCESS_KEYWORD` | 管理者用キーワード（ランダムな文字列） | `admin2024secret123` |

### オプション環境変数

| 環境変数名 | 説明 | デフォルト値 |
|-----------|------|------------|
| `NEXT_PUBLIC_ADMIN_URL` | 管理画面のフルURL | `/admin`（相対パス） |

---

## 🚀 セットアップ手順

### 1. LINE Messaging APIの設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. Messaging APIチャネルを選択
3. **Channel Access Token** を発行
   - 「Messaging API」タブ → 「チャネルアクセストークン」→「発行」
4. **Channel Secret** を確認
   - 「基本設定」タブ → 「チャネルシークレット」

### 2. 環境変数の設定

#### ローカル開発環境

`.env.local` ファイルに追加：

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# 管理者用キーワード（ランダムな文字列）
ADMIN_ACCESS_KEYWORD=admin2024secret123

# 管理画面URL（オプション）
NEXT_PUBLIC_ADMIN_URL=http://localhost:3000/admin
```

#### 本番環境（AWS Amplify）

1. AWS Amplify Console にログイン
2. アプリを選択
3. 「Environment variables」を選択
4. 以下の環境変数を追加：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `ADMIN_ACCESS_KEYWORD`
   - `NEXT_PUBLIC_ADMIN_URL`（オプション）
5. 「Save」をクリック
6. 再デプロイを実行

### 3. Webhook URLの設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. Messaging APIチャネルを選択
3. 「Messaging API」タブ → 「Webhook URL」→「編集」
4. Webhook URLを設定：
   - **ローカル開発**: `https://your-ngrok-url.ngrok.io/api/webhook/line`
   - **本番環境**: `https://your-domain.amplifyapp.com/api/webhook/line`
5. 「Webhookの利用」を有効化
6. 「検証」をクリックして接続を確認

### 4. 動作確認

1. LINE公式アカウントを友だち追加
2. 管理者用キーワードを送信
3. 管理画面URLが返信されることを確認

---

## 🔒 セキュリティ

### 実装されているセキュリティ機能

1. **Webhook署名検証**
   - LINE Messaging APIからのリクエストであることを確認
   - 不正なリクエストを拒否

2. **キーワード認証**
   - 管理者用キーワードが一致した場合のみURLを返信
   - 推測されにくいランダムな文字列を使用

### セキュリティ推奨事項

1. **キーワードの強度**
   - 推測されにくい、ランダムな文字列を設定
   - 例: `admin2024secret123`（実際にはもっと複雑な文字列を推奨）

2. **キーワードの管理**
   - キーワードは管理者のみが知っている必要があります
   - 定期的にキーワードを変更することを推奨

3. **環境変数の保護**
   - 環境変数はGitにコミットしない
   - `.env.local` は `.gitignore` に含める

---

## 🛠️ トラブルシューティング

### Webhookが動作しない

1. **環境変数の確認**
   - `LINE_CHANNEL_ACCESS_TOKEN` が正しく設定されているか
   - `LINE_CHANNEL_SECRET` が正しく設定されているか

2. **Webhook URLの確認**
   - LINE Developers ConsoleでWebhook URLが正しく設定されているか
   - 「Webhookの利用」が有効になっているか

3. **ログの確認**
   - サーバーログでエラーを確認
   - AWS Amplifyのログを確認

### キーワードが反応しない

1. **環境変数の確認**
   - `ADMIN_ACCESS_KEYWORD` が正しく設定されているか
   - 大文字小文字、空白に注意

2. **メッセージの確認**
   - 送信したメッセージが正確にキーワードと一致しているか
   - 前後の空白がないか確認

### URLが返信されない

1. **管理画面URLの確認**
   - `NEXT_PUBLIC_ADMIN_URL` が正しく設定されているか
   - 設定しない場合、相対パス `/admin` が使用される

2. **LINEクライアントの確認**
   - `LINE_CHANNEL_ACCESS_TOKEN` が有効か確認
   - トークンの有効期限を確認

---

## 📚 関連ドキュメント

- [管理画面アクセス方法](../admin/アクセス方法.md)
- [LINE公式アカウント設定](./LINE公式アカウント設定.md)
- [環境変数の管理方法](../dev/環境変数の管理方法.md)
- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)

---

## 💡 今後の改善案

1. **複数キーワードの対応**
   - 複数の管理者用キーワードを設定可能にする

2. **アクセスログの記録**
   - キーワード送信者と送信時刻を記録

3. **一時的なURLの発行**
   - 有効期限付きの一時的なURLを発行

4. **2要素認証の追加**
   - より強固なセキュリティのため、2要素認証を追加





