# スクリプト一覧（CloudFront / S3 / LocalStack）

## 概要

`app/scripts` 配下には、本番環境向けの **CloudFront & S3 CORS 設定** と、開発環境向けの **LocalStack セットアップ** を自動化するスクリプトが用意されています。

- CloudFront & S3 CORS 設定系
  - `setup-cloudfront-cors.sh`（Linux / Mac 用 Bash）
  - `setup-cloudfront-cors.ps1`（Windows 用 PowerShell）
- LocalStack セットアップ系
  - `setup-localstack.sh`（Linux / Mac 用 Bash）
  - `setup-localstack.ps1`（Windows 用 PowerShell）
  - `setup-localstack.js`（Node.js 版 / クロスプラットフォーム）

それぞれの役割と使い方を以下にまとめます。

---

## CloudFront & S3 CORS 設定スクリプト

対象ファイル:

- `setup-cloudfront-cors.sh`
- `setup-cloudfront-cors.ps1`

### 目的（LocalStack）

LINE アプリ内での動画再生に必要な **S3 バケットの CORS 設定** と **CloudFront レスポンスヘッダーポリシー** を自動で設定します。

### 前提条件

1. AWS CLI がインストールされていること
2. AWS 認証情報が設定されていること（`aws configure` で設定）
3. 必要な権限があること
   - S3: `s3:PutBucketCORS`
   - CloudFront: `cloudfront:CreateResponseHeadersPolicy`, `cloudfront:UpdateResponseHeadersPolicy`, `cloudfront:GetDistributionConfig`, `cloudfront:UpdateDistribution`

### 使い分け

- **Linux / Mac**: `setup-cloudfront-cors.sh`
- **Windows**: `setup-cloudfront-cors.ps1`

### 実行方法（CloudFront & S3 CORS）

#### Linux / Mac（Bash・LocalStack）

```bash
chmod +x app/scripts/setup-cloudfront-cors.sh
./app/scripts/setup-cloudfront-cors.sh
```

#### Windows（PowerShell・LocalStack）

```powershell
cd app
.\scripts\setup-cloudfront-cors.ps1
```

### 上書き可能な環境変数

- `S3_BUCKET_NAME`: S3 バケット名（デフォルト: `gacha-lab-test`）
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront ディストリビューション ID（デフォルト: `E2O1UP219WO08E`）
- `S3_REGION`: S3 リージョン（デフォルト: `ap-northeast-1`）

### 主な処理内容

1. **S3 バケットの CORS 設定を更新**
   - `line://` や `https://liff.line.me`、Amplify の URL などを許可
   - 動画ストリーミングに必要なレスポンスヘッダーを公開
2. **CloudFront レスポンスヘッダーポリシーを作成 / 更新**
   - 名前: `LineAppVideoCORS`
   - すべてのオリジン（`*`）を許可し、必要な CORS ヘッダーを設定
3. **CloudFront ディストリビューションを更新**
   - デフォルトビヘイビアにレスポンスヘッダーポリシーを適用
   - 許可メソッドを `GET, HEAD, OPTIONS` に設定

### 実行後の注意点

- CloudFront のデプロイには **5〜15 分程度** かかります
- デプロイ完了後にキャッシュを無効化する必要があります

キャッシュ無効化コマンド例:

```bash
aws cloudfront create-invalidation \
  --distribution-id E2O1UP219WO08E \
  --paths '/*'
```

（もしくは AWS コンソールから手動で無効化）

### トラブルシューティング（CloudFront & S3 CORS）

- **Access Denied**: IAM ポリシーに必要な権限が付与されているか確認
- **Distribution is not deployed**: 前回のデプロイが完了しているか確認
- **ETag mismatch**: 他の操作と競合している可能性があるため、少し時間を空けて再実行

---

## LocalStack セットアップスクリプト

対象ファイル:

- `setup-localstack.sh`
- `setup-localstack.ps1`
- `setup-localstack.js`

### 目的

開発環境で AWS S3 をエミュレートする **LocalStack** を立ち上げ、  
アプリケーションからローカルの S3 互換エンドポイントを使って動作確認できるようにします。

### LocalStack の前提条件

1. Docker / Docker Desktop がインストールされていること
2. `docker-compose` が使用できること
3. `docker-compose.localstack.yml` がプロジェクトルートに存在すること
4. （任意）AWS CLI がインストールされていること（バケット自動作成に使用）

### スクリプトごとの違い

- **Linux / Mac 用 Bash**: `setup-localstack.sh`
- **Windows 用 PowerShell**: `setup-localstack.ps1`
- **Node.js 版（クロスプラットフォーム）**: `setup-localstack.js`
  - `npm` スクリプトから呼び出しやすい形

### 実行方法（LocalStack）

#### Linux / Mac（Bash）

```bash
chmod +x app/scripts/setup-localstack.sh
./app/scripts/setup-localstack.sh
```

#### Windows（PowerShell）

```powershell
cd app
.\scripts\setup-localstack.ps1
```

#### Node.js 版（OS 共通）

`package.json` のスクリプトから実行（例）:

```bash
npm run localstack:setup
```

（直接実行する場合）

```bash
node app/scripts/setup-localstack.js
```

### 使用する環境変数（LocalStack）

- `AWS_S3_BUCKET_NAME`: LocalStack 上に作成する S3 バケット名  
  （未設定時は `gacha-lab-test`）
- `LOCALSTACK_ENDPOINT`: LocalStack のエンドポイント URL  
  （Node.js 版のみ、デフォルト: `http://localhost:4566`）

### 主な処理内容（各スクリプト共通）

1. `docker-compose -f docker-compose.localstack.yml up -d` で LocalStack コンテナを起動
2. 数秒待機して LocalStack の起動完了を待つ
3. LocalStack 上に S3 バケット（`AWS_S3_BUCKET_NAME`）を作成
4. 次のステップとして、`.env.local` の設定例や開発サーバー起動コマンドを表示

`.env.local` の例:

```text
USE_LOCALSTACK=true
AWS_S3_BUCKET_NAME=gacha-lab-test
```

### LocalStack 停止方法

共通で以下のコマンドを使用します:

```bash
docker-compose -f docker-compose.localstack.yml down
```

（Node.js 版では `npm run localstack:down` のようにラップして使う想定）
