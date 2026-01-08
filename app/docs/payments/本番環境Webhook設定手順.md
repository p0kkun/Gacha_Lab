# 本番環境Webhook設定手順

## 概要

本番環境（AWS Amplify）でStripe Webhookを正しく動作させるための設定手順です。

## 問題

本番環境のログで以下のエラーが発生している場合：

```
Webhook: STRIPE_WEBHOOK_SECRETが設定されていません
```

これは、AWS Amplifyの環境変数に`STRIPE_WEBHOOK_SECRET`が設定されていないことを示しています。

## 解決手順

### 1. StripeダッシュボードでWebhookエンドポイントを作成

1. [Stripeダッシュボード](https://dashboard.stripe.com/)にログイン
2. **開発者** → **Webhook** を選択
3. **エンドポイントを追加** をクリック
4. エンドポイントURLを入力：
   ```
   https://dev.d2zlbom9902v0u.amplifyapp.com/api/points/webhook
   ```
   - 実際のAmplifyアプリのURLに置き換えてください
5. **イベントを選択** で以下のイベントを選択：
   - `payment_intent.succeeded`
6. **エンドポイントを追加** をクリック

### 2. Webhook署名シークレットを取得

1. 作成したWebhookエンドポイントをクリック
2. **署名シークレット** セクションを確認
3. **署名シークレットを表示** をクリック
4. 表示された `whsec_xxxxxxxxxxxxx` をコピー

### 3. AWS Amplifyの環境変数に設定

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/)にログイン
2. 対象のアプリを選択
3. 左メニューから **環境変数** を選択
4. **環境変数を管理** をクリック
5. 以下の環境変数を追加/更新：

   | キー | 値 | 説明 |
   |------|-----|------|
   | `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxxxxxxxxxx` | Stripeダッシュボードで取得したWebhook署名シークレット |

6. **保存** をクリック

### 4. アプリを再デプロイ

環境変数を追加/更新した後、アプリを再デプロイする必要があります：

1. AWS Amplify Consoleで **再デプロイ** をクリック
2. または、GitHubにコミット・プッシュして自動デプロイをトリガー

### 5. 動作確認

1. ポイント購入ページで決済を実行
2. Stripeダッシュボードの **開発者** → **Webhook** → **ログ** を確認
3. `payment_intent.succeeded` イベントが記録されているか確認
4. エラーが発生していないか確認
5. ポイントが正しく加算されているか確認

## 必要な環境変数一覧

本番環境で必要な環境変数：

| キー | 説明 | 取得方法 |
|------|------|----------|
| `STRIPE_SECRET_KEY` | Stripeシークレットキー | Stripeダッシュボード → 開発者 → APIキー |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe公開可能キー | Stripeダッシュボード → 開発者 → APIキー |
| `STRIPE_WEBHOOK_SECRET` | Webhook署名シークレット | Stripeダッシュボード → 開発者 → Webhook → エンドポイント → 署名シークレット |
| `DATABASE_URL` | データベース接続URL | AWS RDSコンソール |
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID | LINE Developers Console |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEチャネルアクセストークン | LINE Developers Console |
| `LINE_CHANNEL_SECRET` | LINEチャネルシークレット | LINE Developers Console |
| `ADMIN_ACCESS_KEYWORD` | 管理画面アクセスキーワード | 任意の文字列 |
| `NEXT_PUBLIC_ADMIN_URL` | 管理画面URL | 管理画面のURL |
| `RUN_SEED` | シードデータ投入フラグ | `true` または未設定 |

## トラブルシューティング

### エラー: `Webhook: STRIPE_WEBHOOK_SECRETが設定されていません`

**原因**: AWS Amplifyの環境変数に`STRIPE_WEBHOOK_SECRET`が設定されていない

**解決方法**:
1. AWS Amplify Consoleで環境変数を確認
2. `STRIPE_WEBHOOK_SECRET`が正しく設定されているか確認
3. 設定後、アプリを再デプロイ

### エラー: `署名検証に失敗しました`

**原因**: Webhook署名シークレットが正しくない、またはWebhookエンドポイントのURLが間違っている

**解決方法**:
1. StripeダッシュボードでWebhookエンドポイントのURLを確認
2. 署名シークレットが正しいか確認
3. AWS Amplifyの環境変数とStripeダッシュボードの署名シークレットが一致しているか確認

### ポイントが加算されない

**原因**: Webhookが呼び出されていない、または処理に失敗している

**解決方法**:
1. StripeダッシュボードのWebhookログを確認
2. エラーが発生している場合は、エラーメッセージを確認
3. サーバーログでWebhookの処理状況を確認
4. `/api/points/confirm`エンドポイントがフォールバックとして動作するか確認

## 注意事項

- **テストモードと本番モード**: Stripeにはテストモードと本番モードがあり、それぞれ異なるWebhookエンドポイントと署名シークレットが必要です
- **環境変数の更新**: 環境変数を更新した後は、必ずアプリを再デプロイしてください
- **セキュリティ**: Webhook署名シークレットは機密情報です。GitHubなどにコミットしないでください





