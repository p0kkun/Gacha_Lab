# Terraform - AWS RDS PostgreSQL 構築

## 概要

このTerraform設定を使用して、AWSの無料枠でRDS PostgreSQLインスタンスを一括構築できます。

## 前提条件

1. **AWSアカウント**が作成されていること
2. **AWS CLI**がインストール・設定されていること
3. **Terraform**がインストールされていること

### AWS CLIの設定

**方法1: `aws configure`コマンドを使用（推奨）**

```powershell
aws configure
```

以下の情報を入力：
- AWS Access Key ID: `YOUR_AWS_ACCESS_KEY_ID`（実際のアクセスキーを入力）
- AWS Secret Access Key: `YOUR_AWS_SECRET_ACCESS_KEY`（実際のシークレットキーを入力）
- Default region: `ap-northeast-1`
- Default output format: `json`

**方法2: 認証情報ファイルを直接作成**

`%USERPROFILE%\.aws\credentials`ファイルを作成：

```ini
[default]
aws_access_key_id = YOUR_AWS_ACCESS_KEY_ID
aws_secret_access_key = YOUR_AWS_SECRET_ACCESS_KEY
```

`%USERPROFILE%\.aws\config`ファイルを作成：

```ini
[default]
region = ap-northeast-1
output = json
```

**⚠️ セキュリティ注意事項**:
- 認証情報は絶対にGitにコミットしないでください
- 認証情報が漏洩した場合は、すぐにAWS IAMでキーを無効化してください
- 必要最小限の権限のみを付与したIAMユーザーを使用してください

### Terraformのインストール

```powershell
# Chocolateyを使用
choco install terraform

# または公式インストーラーを使用
# https://www.terraform.io/downloads
```

## セットアップ手順

### 1. 変数ファイルの作成

```powershell
cd terraform
copy terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`を編集して、データベースパスワードを設定：

```hcl
db_password = "YourSecurePassword123!"
```

**⚠️ 重要**: `terraform.tfvars`は`.gitignore`に含まれています。Gitにコミットしないでください。

### 2. Terraformの初期化

```powershell
terraform init
```

これにより、必要なプロバイダー（AWS）がダウンロードされます。

### 3. 実行計画の確認

```powershell
terraform plan
```

作成されるリソースを確認します。

### 4. リソースの作成

```powershell
terraform apply
```

確認を求められたら、`yes`と入力します。

**作成時間**: 約5-10分かかります。

### 5. 出力情報の確認

作成が完了すると、以下の情報が表示されます：

```
db_endpoint = "gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432"
db_port = 5432
db_name = "gacha_lab"
db_username = "postgres"
database_url = "postgresql://postgres:password@..."
```

### 6. 環境変数の設定

出力された`database_url`を`.env.local`に設定：

```env
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require
```

または、個別の情報から構築：

```env
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@[db_endpoint]:5432/gacha_lab?sslmode=require
```

## リソースの削除

### すべてのリソースを削除

```powershell
terraform destroy
```

**⚠️ 注意**: このコマンドはすべてのリソース（データベース、セキュリティグループなど）を削除します。データは復元できません。

## 無料枠の確認

### 作成されるリソース

- **RDS PostgreSQL**: `db.t3.micro`インスタンス
- **ストレージ**: 20GB（gp3）
- **セキュリティグループ**: 1つ
- **DBサブネットグループ**: 1つ

### 無料枠の制限

- **RDS PostgreSQL**: 750時間/月（12ヶ月間）
- **ストレージ**: 20GB（12ヶ月間）
- **データ転送**: 15GB/月（12ヶ月間）

**注意**: 無料枠を超えると課金されます。使用量に注意してください。

## トラブルシューティング

### エラー: "Error: error creating DB Instance"

- AWSアカウントのクレジットカード情報が登録されているか確認
- 無料枠の制限を超えていないか確認
- リージョンが正しいか確認（`ap-northeast-1`）

### エラー: "Error: InvalidParameterValue"

- パスワードが8文字以上か確認
- インスタンスクラスが`db.t3.micro`か確認

### 接続できない

- セキュリティグループのインバウンドルールを確認
- エンドポイントが正しいか確認
- パスワードが正しいか確認

## 本番環境への移行

本番環境に移行する際は、以下の変更を推奨します：

1. **セキュリティグループ**: 特定のIPアドレスのみ許可
2. **パブリックアクセス**: `publicly_accessible = false`に変更
3. **削除保護**: `deletion_protection = true`に変更
4. **暗号化**: `storage_encrypted = true`に変更
5. **バックアップ**: より長い保持期間を設定

## 参考資料

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS RDS Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- [AWS 無料利用枠](https://aws.amazon.com/jp/free/)
- [AWS RDS 料金](https://aws.amazon.com/jp/rds/pricing/)

