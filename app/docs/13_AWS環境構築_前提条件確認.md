# AWS環境構築 - 前提条件確認

## 概要

AWS環境構築を開始する前に、必要な前提条件を確認します。

---

## ✅ 前提条件チェックリスト

### 1. AWSアカウント

- [ ] AWSアカウントが作成されている
- [ ] クレジットカード情報が登録されている（無料枠内では課金されません）
- [ ] 電話番号認証が完了している

**確認方法**:
- [AWSマネジメントコンソール](https://console.aws.amazon.com/)にログインできるか確認

**未作成の場合**:
- [AWSアカウント作成](https://aws.amazon.com/jp/)から作成

---

### 2. AWS CLI

- [ ] AWS CLIがインストールされている
- [ ] AWS認証情報が設定されている

**確認方法**:

```powershell
# AWS CLIのバージョン確認
aws --version

# 認証情報の確認
aws sts get-caller-identity
```

**未インストールの場合**:

```powershell
# Chocolateyを使用
choco install awscli

# または公式インストーラーを使用
# https://aws.amazon.com/jp/cli/
```

**認証情報の設定**:

```powershell
aws configure
```

以下の情報を入力：
- AWS Access Key ID: （IAMユーザーのアクセスキー）
- AWS Secret Access Key: （IAMユーザーのシークレットキー）
- Default region: `ap-northeast-1`
- Default output format: `json`

**⚠️ 重要**: 
- IAMユーザーを作成し、必要最小限の権限のみを付与してください
- ルートアカウントの認証情報は使用しないでください

---

### 3. Terraform

- [ ] Terraformがインストールされている

**確認方法**:

```powershell
terraform --version
```

**未インストールの場合**:

```powershell
# Chocolateyを使用
choco install terraform

# または公式インストーラーを使用
# https://www.terraform.io/downloads
```

---

### 4. IAMユーザーと権限

- [ ] IAMユーザーが作成されている
- [ ] 必要な権限が付与されている

**必要な権限**:

- RDS関連: `rds:*`
- EC2関連（VPC、セキュリティグループ）: 
  - `ec2:DescribeVpcs`
  - `ec2:DescribeSubnets`
  - `ec2:DescribeSecurityGroups`
  - `ec2:CreateSecurityGroup`
  - `ec2:AuthorizeSecurityGroupIngress`
  - `ec2:AuthorizeSecurityGroupEgress`

**IAMユーザー作成手順**:

1. AWSマネジメントコンソール → IAM
2. 「ユーザー」→「ユーザーを追加」
3. ユーザー名を入力
4. 「プログラムによるアクセス」を選択
5. 「既存のポリシーを直接アタッチ」を選択
6. 必要な権限を選択（またはカスタムポリシーを作成）
7. アクセスキーを保存（表示されるのは一度だけ）

---

## 📋 構築手順の全体像

### Phase 1: AWS RDS PostgreSQL構築（今回）

1. Terraform設定の確認
2. 変数ファイルの作成
3. Terraformの初期化
4. 実行計画の確認
5. リソースの作成
6. 環境変数の設定

### Phase 2: デプロイ環境構築（次回）

1. VercelまたはAWS Amplifyの選択
2. デプロイ環境のセットアップ
3. 環境変数の設定
4. デプロイの実行

---

## 🚀 次のステップ

前提条件が整ったら、以下を実行：

1. **AWS RDS構築**: `terraform/README.md`を参照
2. **環境変数の設定**: `.env.local`に`DATABASE_URL`を追加
3. **マイグレーション実行**: `npm run db:migrate`
4. **シードデータ投入**: `npm run db:seed`

---

## 参考

- [Terraform README](../terraform/README.md)
- [AWSデータベース設定手順](./11_AWSデータベース設定.md)
- [AWS CLI ドキュメント](https://docs.aws.amazon.com/cli/latest/userguide/)
- [Terraform ドキュメント](https://www.terraform.io/docs)

