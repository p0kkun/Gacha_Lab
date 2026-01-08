# PayPay決済とWebhook設定

## 概要

PayPay決済が成功してもポイントが加算されない場合、Webhookが正しく設定されていない可能性があります。

## ローカル開発環境でのWebhook設定

### 方法1: Stripe CLIを使用（推奨）

ローカル開発環境では、Stripe CLIを使用してWebhookを転送する方法が最も簡単です。

#### 1. Stripe CLIのインストール

```powershell
# Windows (Scoop)
scoop install stripe

# または公式インストーラーを使用
# https://stripe.com/docs/stripe-cli
```

#### 2. Stripe CLIでログイン

```powershell
stripe login
```

ブラウザが開き、Stripeアカウントでログインします。

#### 3. Webhookを転送

```powershell
stripe listen --forward-to localhost:3000/api/points/webhook
```

実行すると、以下のようなメッセージが表示されます：

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

#### 4. Webhook署名シークレットを環境変数に設定

表示された `whsec_xxxxxxxxxxxxx` を `.env.local` に設定：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### 5. 開発サーバーを再起動

環境変数を変更した場合は、開発サーバーを再起動してください。

### 方法2: ngrok + StripeダッシュボードでWebhookを設定

ngrokを使用している場合、StripeダッシュボードでWebhookエンドポイントを設定することもできます。

## Webhook設定手順（本番環境・ngrok使用時）

### 1. StripeダッシュボードでWebhookを設定

1. [Stripeダッシュボード](https://dashboard.stripe.com/)にログイン
2. **開発者** → **Webhook** を選択
3. **エンドポイントを追加** をクリック
4. エンドポイントURLを入力：
   ```
   https://your-domain.com/api/points/webhook
   ```
   - ローカル開発環境の場合、ngrokなどのトンネルサービスを使用：
   ```
   https://your-ngrok-url.ngrok-free.app/api/points/webhook
   ```
5. **イベントを選択** で以下のイベントを選択：
   - `payment_intent.succeeded`
6. **エンドポイントを追加** をクリック

### 2. Webhook署名シークレットを取得

1. 作成したWebhookエンドポイントをクリック
2. **署名シークレット** をコピー
3. 環境変数に設定：
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### 3. 環境変数の確認

以下の環境変数が正しく設定されているか確認してください：

```env
# Stripe API キー
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Webhook署名シークレット
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## トラブルシューティング

### ポイントが加算されない場合

1. **Webhookが呼び出されているか確認**
   - Stripeダッシュボードの **開発者** → **Webhook** → **ログ** を確認
   - `payment_intent.succeeded` イベントが記録されているか確認
   - エラーが発生している場合は、エラーメッセージを確認

2. **サーバーログを確認**
   - アプリケーションのログで以下のメッセージを確認：
     - `Webhook受信:`
     - `Webhook署名検証成功:`
     - `Webhook: ポイント購入成功:`

3. **メタデータの確認**
   - PaymentIntentのメタデータに以下が含まれているか確認：
     - `type: "point_purchase"`
     - `userId: "LINEユーザーID"`
     - `points: "ポイント数"`

4. **Webhook署名の確認**
   - `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認
   - Webhookエンドポイントの署名シークレットと一致しているか確認

### よくあるエラー

#### エラー: `署名がありません`
- **原因**: Webhookリクエストに `stripe-signature` ヘッダーが含まれていない
- **対処**: StripeダッシュボードでWebhookエンドポイントが正しく設定されているか確認

#### エラー: `署名検証に失敗しました`
- **原因**: `STRIPE_WEBHOOK_SECRET` が正しく設定されていない、またはWebhookエンドポイントの署名シークレットと一致していない
- **対処**: 環境変数 `STRIPE_WEBHOOK_SECRET` を正しく設定

#### エラー: `無効なメタデータ`
- **原因**: PaymentIntentのメタデータに `type: "point_purchase"` が含まれていない、または `userId` や `points` が設定されていない
- **対処**: `/api/points/purchase` エンドポイントでメタデータが正しく設定されているか確認

## テスト方法

### 1. テストカードで決済を実行

1. ポイント購入ページでテストカードを使用して決済を実行
2. 決済成功後、ポイント残高が更新されるか確認
3. サーバーログでWebhookが正しく処理されているか確認

### 2. Stripe CLIでWebhookをテスト（ローカル開発環境）

```bash
# Stripe CLIをインストール
# https://stripe.com/docs/stripe-cli

# Webhookを転送
stripe listen --forward-to localhost:3000/api/points/webhook

# テストイベントを送信
stripe trigger payment_intent.succeeded
```

## 注意事項

- **PayPay決済はリダイレクト型決済**
  - PayPay決済では、ユーザーがPayPayアプリにリダイレクトされ、決済完了後に元のページに戻ります
  - Webhookが呼び出されるまでに数秒かかる場合があります
  - リダイレクト後の処理で、最大10秒間ポーリングしてポイント残高を確認します

- **本番環境でのWebhook URL**
  - 本番環境では、AWS Amplifyなどのデプロイ先のURLを使用
  - Webhook URLは `https://` で始まる必要があります

- **Webhookの再試行**
  - StripeはWebhookの送信に失敗した場合、自動的に再試行します
  - 再試行は最大3日間続きます

## 関連ファイル

- `/app/api/points/webhook/route.ts` - Webhookエンドポイント
- `/app/api/points/purchase/route.ts` - PaymentIntent作成エンドポイント
- `/app/app/points/page.tsx` - ポイント購入ページ

