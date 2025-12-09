# AWS無料枠での完結構成

## 概要

AWSの無料枠だけでアプリケーションを完結させる構成です。

---

## 🎯 AWS無料枠での完結構成

### 必要なサービス

1. **AWS RDS PostgreSQL**（無料枠）
   - ✅ 既に構築済み（Terraformで作成）
   - 750時間/月（12ヶ月間）
   - 20GBストレージ（12ヶ月間）

2. **AWS Amplify**（無料枠）
   - ✅ ホスティングサービス
   - 5GBストレージ
   - 15分/月のビルド時間
   - 100GB/月のデータ転送

### 構成図

```
┌─────────────────┐
│  AWS Amplify    │  ← アプリホスティング（無料枠）
│  (Next.js App)  │
└────────┬────────┘
         │
         │ DATABASE_URL
         │
┌────────▼────────┐
│  AWS RDS        │  ← データベース（無料枠）
│  PostgreSQL     │
└─────────────────┘
```

---

## ✅ メリット

1. **AWS内で完結**
   - すべてのリソースがAWS内
   - 管理が一元化される

2. **無料枠で十分**
   - RDS: 無料枠あり
   - Amplify: 無料枠あり

3. **AWSサービスとの統合**
   - 他のAWSサービスと連携しやすい
   - IAMでの権限管理が統一される

---

## ❌ デメリット（Vercelと比較）

1. **Next.js最適化**
   - Amplify: ⭐⭐⭐
   - Vercel: ⭐⭐⭐⭐⭐

2. **設定の簡単さ**
   - Amplify: ⭐⭐⭐
   - Vercel: ⭐⭐⭐⭐⭐

3. **学習コスト**
   - Amplify: 中程度
   - Vercel: 低い

---

## 🚀 AWS Amplifyでのデプロイ手順

### 1. Amplify Consoleにアクセス

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/)にアクセス
2. 「New app」→「Host web app」をクリック

### 2. GitHubリポジトリの接続

1. 「GitHub」を選択
2. GitHubアカウントで認証
3. リポジトリを選択
4. ブランチを選択（通常は`main`）

### 3. ビルド設定

1. **App name**: `gacha-lab`（任意）
2. **Environment**: `production`
3. **Build settings**: 自動検出されるが、必要に応じて調整

**ビルド設定の例**:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd app
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: app/.next
    files:
      - '**/*'
  cache:
    paths:
      - app/node_modules/**/*
```

### 4. 環境変数の設定

1. 「Environment variables」をクリック
2. 以下の環境変数を追加：
   - `NEXT_PUBLIC_LIFF_ID`: `2008642684-d8jPmggE`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`: `admin`
   - `DATABASE_URL`: `postgresql://postgres:GachaLab2024!Secure@gacha-lab-db.cds4guwa0y2c.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require`

### 5. デプロイ

1. 「Save and deploy」をクリック
2. ビルドとデプロイが自動的に開始される
3. 数分で完了

---

## 📊 無料枠の制限

### AWS RDS PostgreSQL

- **インスタンス**: 750時間/月（12ヶ月間）
- **ストレージ**: 20GB（12ヶ月間）
- **データ転送**: 15GB/月（12ヶ月間）

### AWS Amplify

- **ストレージ**: 5GB
- **ビルド時間**: 15分/月
- **データ転送**: 100GB/月

**注意**: 無料枠を超えると課金されます。

---

## 🎯 結論

### AWS無料枠だけで完結する場合

- ✅ **Vercelは不要**
- ✅ **AWS Amplify + AWS RDS**で完結
- ✅ すべてAWS内で管理

### Vercelを使う場合

- ✅ Next.jsに最適化されている
- ✅ 設定が簡単
- ✅ AWS外のサービスを使用

---

## 📝 推奨

### このプロジェクトの場合

**AWS無料枠だけで完結する場合**:
- データベース: AWS RDS PostgreSQL（既に構築済み）
- アプリホスティング: AWS Amplify

**Vercelを使う場合**:
- データベース: AWS RDS PostgreSQL（既に構築済み）
- アプリホスティング: Vercel

どちらも無料枠で利用可能です。**AWS内で完結したい場合はAmplify、Next.jsに最適化された簡単な設定を選ぶ場合はVercel**を推奨します。

---

## 参考

- [AWS Amplify ドキュメント](https://docs.aws.amazon.com/amplify/)
- [AWS Amplify 無料枠](https://aws.amazon.com/jp/amplify/pricing/)
- [AWS RDS 無料枠](https://aws.amazon.com/jp/rds/free/)
- [AWS AmplifyとRDSの関係](./14_AWS_AmplifyとRDSの関係.md)

