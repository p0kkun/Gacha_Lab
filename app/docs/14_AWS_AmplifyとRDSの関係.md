# AWS Amplify と RDS の関係

## 概要

AWS Amplify を使用した場合の RDS PostgreSQL 構築について説明します。

---

## 🔍 結論：Amplify だけでは RDS は自動構築できない

**AWS Amplify は、RDS PostgreSQL の自動構築を直接サポートしていません。**

Amplify は主に**サーバーレスバックエンド**（DynamoDB、AppSync、Lambda など）に特化しており、従来型の RDS データベースの自動構築は含まれていません。

---

## 📊 Amplify で自動構築できるもの vs できないもの

### ✅ Amplify で自動構築できるもの

1. **DynamoDB**（NoSQL データベース）

   ```bash
   amplify add storage
   # DynamoDBを選択
   ```

2. **AppSync GraphQL API**

   ```bash
   amplify add api
   # GraphQLを選択
   ```

3. **REST API（Lambda + API Gateway）**

   ```bash
   amplify add api
   # RESTを選択
   ```

4. **認証（Cognito）**

   ```bash
   amplify add auth
   ```

5. **ホスティング（Amplify Console）**
   - Git 連携による自動デプロイ
   - CI/CD パイプライン

### ❌ Amplify で自動構築できないもの

1. **RDS PostgreSQL**（今回必要なもの）

   - 手動で構築する必要がある
   - Terraform または AWS コンソールから作成

2. **EC2 インスタンス**

   - 手動で構築する必要がある

3. **その他の従来型インフラ**
   - VPC、セキュリティグループなども手動設定が必要

---

## 🎯 推奨アプローチ

### オプション 1: Terraform + Amplify（推奨）

**RDS 構築**: Terraform を使用

- ✅ コードで管理（Infrastructure as Code）
- ✅ 再現性が高い
- ✅ バージョン管理可能
- ✅ 既に設定ファイルが用意されている

**アプリデプロイ**: Amplify Console を使用

- ✅ Git 連携による自動デプロイ
- ✅ CI/CD パイプライン
- ✅ 環境変数の管理

**手順**:

1. Terraform で RDS を構築（`terraform apply`）
2. Amplify Console でアプリをデプロイ
3. Amplify Console の環境変数に`DATABASE_URL`を設定

---

### オプション 2: AWS コンソール + Amplify

**RDS 構築**: AWS マネジメントコンソールから手動作成

- ⚠️ 手作業が必要
- ⚠️ 再現性が低い
- ⚠️ 設定ミスのリスク

**アプリデプロイ**: Amplify Console を使用

---

### オプション 3: Vercel + Terraform（代替案）

**RDS 構築**: Terraform を使用

**アプリデプロイ**: Vercel を使用

- ✅ Next.js に最適化されている
- ✅ 設定が簡単
- ✅ 無料枠あり
- ✅ 環境変数の管理が簡単

**手順**:

1. Terraform で RDS を構築
2. Vercel にプロジェクトをインポート
3. Vercel の環境変数に`DATABASE_URL`を設定

---

## 📋 実際の構築手順（推奨：Terraform + Amplify）

### Phase 1: RDS 構築（Terraform）

```powershell
cd terraform
terraform init
terraform plan
terraform apply
```

**出力**:

- `db_endpoint`: RDS エンドポイント
- `database_url`: 接続文字列

### Phase 2: Amplify Console でデプロイ

1. **Amplify Console にアクセス**

   - [AWS Amplify Console](https://console.aws.amazon.com/amplify/)

2. **アプリの作成**

   - 「新しいアプリ」→「GitHub からホスト」
   - GitHub リポジトリを選択

3. **ビルド設定**

   - Next.js のビルドコマンドを設定
   - 環境変数を設定（`DATABASE_URL`など）

4. **デプロイ**
   - 自動的にデプロイが開始される

---

## 🔄 Amplify CLI を使う場合

Amplify CLI を使用する場合でも、RDS は別途構築が必要です：

```bash
# Amplifyプロジェクトの初期化
amplify init

# バックエンド機能の追加（DynamoDBなど）
amplify add storage
amplify add api
amplify add auth

# ただし、RDSは追加できない
# amplify add rds  # ← このコマンドは存在しない
```

**RDS は別途構築**:

- Terraform を使用
- または AWS コンソールから手動作成

---

## 💡 なぜ RDS が必要なのか

このプロジェクトでは**PostgreSQL + Prisma**を使用しているため：

- ✅ **Prisma**: PostgreSQL、MySQL、SQLite などをサポート
- ❌ **DynamoDB**: Prisma は DynamoDB を直接サポートしていない（Prisma Data Proxy が必要）

**選択肢**:

1. **RDS PostgreSQL**（現在の選択）: Prisma と直接連携可能
2. **DynamoDB**: Prisma Data Proxy が必要（追加コスト・複雑性）

---

## 🎯 最終的な推奨構成

### 開発環境

- **ローカル DB**: PostgreSQL（Docker または直接インストール）
- **開発サーバー**: `npm run dev`

### 本番環境

- **データベース**: AWS RDS PostgreSQL（Terraform で構築）
- **アプリホスティング**:
  - **オプション A**: AWS Amplify Console（Git 連携、CI/CD）
  - **オプション B**: Vercel（Next.js に最適化、設定が簡単）

---

## 📝 まとめ

| 項目                       | Amplify で自動構築 | 別途構築が必要    |
| -------------------------- | ------------------ | ----------------- |
| RDS PostgreSQL             | ❌                 | ✅ Terraform 推奨 |
| DynamoDB                   | ✅                 | -                 |
| アプリホスティング         | ✅                 | -                 |
| 認証（Cognito）            | ✅                 | -                 |
| API（AppSync/API Gateway） | ✅                 | -                 |

**結論**:

- **RDS は Terraform で構築**（既に設定ファイルが用意されている）
- **アプリは Amplify Console または Vercel でデプロイ**

---

## 参考

- [AWS Amplify ドキュメント](https://docs.amplify.aws/)
- [Terraform README](../terraform/README.md)
- [Vercel ドキュメント](https://vercel.com/docs)
- [Prisma ドキュメント](https://www.prisma.io/docs)

