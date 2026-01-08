# ローカルと DEV 環境の違い - なぜローカルでは成功するか

ローカル環境では動画アップロードが成功するのに、DEV 環境（AWS Amplify）では失敗する理由を説明します。

## 🔍 主な違い

### 1. 環境変数の読み込み方法

#### ローカル環境（`npm run dev`）

- **`.env.local`ファイル**から環境変数を読み込む
- Next.js が自動的に`.env.local`を読み込む
- ファイルが存在すれば、すぐに反映される

```env
# .env.local（ローカル開発用）
S3_REGION=ap-northeast-1
S3_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=gacha-lab-test
CLOUDFRONT_DOMAIN=d33hx1uob3y8zt.cloudfront.net
USE_LOCALSTACK=false
```

#### DEV 環境（AWS Amplify）

- **Amplify Console の環境変数設定**から読み込む
- 環境変数を設定した後、**アプリを再デプロイ**する必要がある
- ビルド時に環境変数が埋め込まれる

**重要**: 環境変数を追加・変更した後は、必ず再デプロイが必要です。

---

## 🎯 考えられる原因

### 原因 1: 環境変数が設定されていない

**ローカル**: `.env.local`ファイルに環境変数が設定されている ✅  
**DEV**: Amplify Console で環境変数が設定されていない、または設定されていても再デプロイしていない ❌

### 原因 2: 環境変数の値が間違っている

**ローカル**: `.env.local`の値が正しい ✅  
**DEV**: Amplify Console の環境変数の値が間違っている、またはタイポがある ❌

### 原因 3: 再デプロイしていない

**ローカル**: `.env.local`を変更すると、開発サーバーが自動的に再読み込み ✅  
**DEV**: 環境変数を変更した後、アプリを再デプロイしていない ❌

### 原因 4: ビルド時の環境変数の読み込み

**ローカル**: 開発サーバーが起動時に`.env.local`を読み込む ✅  
**DEV**: ビルド時に環境変数が埋め込まれるため、ビルド後に環境変数を追加しても反映されない ❌

---

## 🔧 確認手順

### ステップ 1: Amplify Console で環境変数を確認

1. AWS Amplify コンソールにアクセス
2. アプリを選択
3. 「環境変数」をクリック
4. 以下の環境変数が**すべて**設定されているか確認：

| 環境変数名             | 値                                         | 設定されているか |
| ---------------------- | ------------------------------------------ | ---------------- |
| `S3_REGION`            | `ap-northeast-1`                           | ⬜               |
| `S3_ACCESS_KEY_ID`     | `AKIAxxxxxxxxxxxxxxxx`                     | ⬜               |
| `S3_SECRET_ACCESS_KEY` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | ⬜               |
| `S3_BUCKET_NAME`       | `gacha-lab-test`                           | ⬜               |
| `CLOUDFRONT_DOMAIN`    | `d33hx1uob3y8zt.cloudfront.net`            | ⬜               |
| `USE_LOCALSTACK`       | `false` または未設定                       | ⬜               |

### ステップ 2: 環境変数の値を確認

各環境変数の値が正しいか確認してください：

- **タイポがないか**
- **余分なスペースがないか**
- **引用符で囲まれていないか**（値は引用符なしで設定）

### ステップ 3: アプリを再デプロイ

環境変数を追加・変更した後は、**必ずアプリを再デプロイ**してください。

1. Amplify Console → アプリを選択
2. 「再デプロイ」ボタンをクリック
3. または、Git にコミット・プッシュして自動デプロイをトリガー

### ステップ 4: ビルドログを確認

再デプロイ後、ビルドログで環境変数が正しく読み込まれているか確認：

1. Amplify Console → アプリ → 「ビルド履歴」
2. 最新のビルドを選択
3. ビルドログを確認
4. エラーがないか確認

---

## 🧪 デバッグ方法

### 方法 1: サーバーサイドで環境変数をログ出力

コードに追加したデバッグログが Amplify のログに出力されます：

1. Amplify Console → アプリ → 「モニタリング」→ 「ログ」
2. 最新のログを確認
3. `S3アップロード設定:` というログを探す
4. 環境変数の設定状況を確認

### 方法 2: API エンドポイントで環境変数を確認

一時的に API エンドポイントで環境変数を返すエンドポイントを作成：

```typescript
// app/api/debug/env/route.ts（一時的なデバッグ用）
export async function GET() {
  return NextResponse.json({
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID
      ? "***設定済み***"
      : "未設定",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY
      ? "***設定済み***"
      : "未設定",
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN,
    USE_LOCALSTACK: process.env.USE_LOCALSTACK,
  });
}
```

**注意**: デバッグ後は必ずこのエンドポイントを削除してください。

---

## 📊 比較表

| 項目                   | ローカル環境               | DEV 環境（Amplify）    |
| ---------------------- | -------------------------- | ---------------------- |
| **環境変数の読み込み** | `.env.local`ファイル       | Amplify Console の設定 |
| **反映タイミング**     | 開発サーバー起動時         | ビルド時               |
| **変更の反映**         | 自動（ホットリロード）     | 再デプロイが必要       |
| **確認方法**           | `.env.local`ファイルを開く | Amplify Console で確認 |
| **デバッグ**           | コンソールログ             | Amplify のログ         |

---

## ✅ 解決方法

### 1. 環境変数を設定

Amplify Console で以下の環境変数を設定：

```
S3_REGION=ap-northeast-1
S3_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=gacha-lab-test
CLOUDFRONT_DOMAIN=d33hx1uob3y8zt.cloudfront.net
USE_LOCALSTACK=false
```

### 2. アプリを再デプロイ

環境変数を設定した後、**必ずアプリを再デプロイ**してください。

### 3. ログで確認

再デプロイ後、Amplify のログで以下を確認：

- `S3アップロード設定:` ログで環境変数が正しく読み込まれているか
- `S3アップロードエラー詳細:` ログでエラーの詳細を確認

---

## 🔗 関連ドキュメント

- [環境変数チェックリスト](./環境変数チェックリスト.md)
- [DEV 環境での S3 アップロードエラー対処法](./DEV環境でのS3アップロードエラー対処法.md)
- [S3 バケットポリシー修正手順](./S3バケットポリシー修正手順.md)



