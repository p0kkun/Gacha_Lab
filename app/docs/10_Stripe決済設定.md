# Stripe 決済設定手順

## 概要

Stripe を使用した決済機能の設定手順です。**テストモード**を使用することで、実際の決済を行わずにシミュレーションが可能です。

---

## 1. Stripe アカウントの作成

### 1.1 アカウント作成

1. [Stripe](https://stripe.com/jp) にアクセス
2. 「今すぐ始める」をクリック
3. アカウントを作成（無料）
4. メールアドレスで登録
5. ダッシュボードにログイン

### 1.2 テストモードの確認

1. Stripe ダッシュボードにログイン
2. 右上の「テストモード」トグルが **ON** になっていることを確認
3. テストモードでは実際の決済は発生しません

---

## 2. API キーの取得

### 2.1 テスト用 API キーの取得

1. Stripe ダッシュボードにログイン
2. 「開発者」→「API キー」に移動
3. **公開可能キー（Publishable key）**をコピー
   - 形式: `pk_test_xxxxxxxxxxxxx`
4. **シークレットキー（Secret key）**をコピー
   - 形式: `sk_test_xxxxxxxxxxxxx`
   - 「表示」ボタンをクリックして表示

**⚠️ 重要**: シークレットキーは絶対に公開しないこと

---

## 3. 環境変数の設定

### 3.1 `.env.local`ファイルに追加

プロジェクトルート（`app/`ディレクトリ）の`.env.local`ファイルに以下を追加：

```env
# Stripe設定（テストモード）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Webhook署名検証用（後で設定）
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**注意**: `xxxxxxxxxxxxx`を実際の API キーに置き換えてください。

### 3.2 環境変数の説明

- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: フロントエンドで使用（公開可能）
- **STRIPE_SECRET_KEY**: サーバー側でのみ使用（機密情報）
- **STRIPE_WEBHOOK_SECRET**: Webhook 署名検証用（後で設定）

---

## 4. 必要なライブラリのインストール

### 4.1 パッケージのインストール

```powershell
cd app
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

### 4.2 インストールされるパッケージ

- `@stripe/stripe-js`: Stripe.js（フロントエンド用）
- `@stripe/react-stripe-js`: React 用 Stripe Elements
- `stripe`: Stripe Node.js SDK（サーバー側用）

---

## 5. テストカード情報

### 5.1 成功するテストカード

| カード番号          | 有効期限         | CVC         | 説明                         |
| ------------------- | ---------------- | ----------- | ---------------------------- |
| 4242 4242 4242 4242 | 任意の未来の日付 | 任意の 3 桁 | 成功するカード（Visa）       |
| 5555 5555 5555 4444 | 任意の未来の日付 | 任意の 3 桁 | 成功するカード（Mastercard） |

### 5.2 エラーをシミュレートするテストカード

| カード番号          | 説明               |
| ------------------- | ------------------ |
| 4000 0000 0000 0002 | カードが拒否される |
| 4000 0000 0000 9995 | 資金不足           |
| 4000 0000 0000 0069 | 有効期限切れ       |

### 5.3 3D セキュアテスト

| カード番号          | 説明                  |
| ------------------- | --------------------- |
| 4000 0025 0000 3155 | 3D セキュア認証が必要 |

---

## 6. Webhook の設定（オプション）

### 6.1 Webhook エンドポイントの作成

ローカル開発環境では、Stripe CLI を使用して Webhook をテストできます。

### 6.2 Stripe CLI のインストール

```powershell
# Windows (Scoop)
scoop install stripe

# または公式インストーラーを使用
# https://stripe.com/docs/stripe-cli
```

### 6.3 ローカル Webhook の転送

```powershell
stripe listen --forward-to localhost:3000/api/payment/webhook
```

これにより、ローカル環境で Webhook をテストできます。

### 6.4 Webhook シークレットの取得

Stripe CLI を実行すると、`whsec_xxxxxxxxxxxxx` 形式のシークレットが表示されます。
これを`.env.local`の`STRIPE_WEBHOOK_SECRET`に設定します。

---

## 7. 動作確認

### 7.1 テスト決済の実行

1. アプリケーションを起動
2. ガチャを引くボタンをクリック
3. 決済モーダルが表示されることを確認
4. テストカード情報を入力
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 任意の未来の日付（例: 12/25）
   - CVC: 任意の 3 桁（例: 123）
5. 決済を実行
6. 決済が成功することを確認

### 7.2 Stripe ダッシュボードでの確認

1. Stripe ダッシュボードにログイン
2. 「支払い」→「支払い」で取引履歴を確認
3. テスト決済が記録されていることを確認
4. 「TEST MODE」のラベルが付いていることを確認

---

## 8. 本番環境への移行

### 8.1 本番モードへの切り替え

1. Stripe ダッシュボードで「本番モード」に切り替え
2. 本番用の API キーを取得
3. 環境変数を本番用に更新

```env
# 本番環境
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### 8.2 注意事項

- ⚠️ 本番環境では実際の決済が発生します
- ⚠️ テストモードと本番モードの API キーは異なります
- ⚠️ Webhook URL も本番環境の URL に設定する必要があります

---

## 確認項目

- [ ] Stripe アカウントを作成した
- [ ] テストモードで API キーを取得した
- [ ] `.env.local`に環境変数を設定した
- [ ] 必要なライブラリをインストールした
- [ ] テストカードで決済が成功することを確認した
- [ ] Stripe ダッシュボードで取引が記録されていることを確認した

---

## トラブルシューティング

### API キーが正しく設定されていない

- `.env.local`の環境変数が正しいか確認
- サーバーを再起動（環境変数の変更を反映）

### 決済が失敗する

- テストモードが ON になっているか確認
- テストカード情報が正しいか確認
- ブラウザのコンソールでエラーを確認

### Webhook が動作しない

- Stripe CLI が正しくインストールされているか確認
- Webhook シークレットが正しく設定されているか確認
- ローカル環境では `stripe listen` コマンドを実行しているか確認

---

## 次のステップ

- [11_データベース設定.md](./11_データベース設定.md) に進む（今後作成予定）
- [Stripe 決済実装方法.md](../Stripe決済実装方法.md) で実装方法を確認

---

## 参考資料

- [Stripe ドキュメント（日本語）](https://stripe.com/docs/jp)
- [Stripe テストカード](https://stripe.com/docs/testing)
- [Stripe Elements](https://stripe.com/docs/stripe-js/react)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)




