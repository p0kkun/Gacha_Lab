# AWS環境構築 - 手順書

## 概要

AWS RDS PostgreSQLを構築し、アプリケーションから接続できるようにする手順です。

---

## 📋 ステップ1: 前提条件の確認

### 1.1 AWS CLIの確認

```powershell
aws --version
```

**未インストールの場合**:
```powershell
choco install awscli
```

### 1.2 Terraformの確認

```powershell
terraform --version
```

**未インストールの場合**:
```powershell
choco install terraform
```

### 1.3 AWS認証情報の確認

```powershell
aws sts get-caller-identity
```

**認証情報が設定されていない場合**:
```powershell
aws configure
```

以下を入力：
- AWS Access Key ID: （IAMユーザーのアクセスキー）
- AWS Secret Access Key: （IAMユーザーのシークレットキー）
- Default region: `ap-northeast-1`
- Default output format: `json`

---

## 📋 ステップ2: Terraform変数ファイルの作成

### 2.1 terraformディレクトリに移動

```powershell
cd C:\Users\sato akihiro\Desktop\test-app\Gacha_Lab\terraform
```

### 2.2 変数ファイルのコピー

```powershell
copy terraform.tfvars.example terraform.tfvars
```

### 2.3 パスワードの設定

`terraform.tfvars`を開いて、データベースパスワードを設定：

```hcl
db_password = "YourSecurePassword123!"
```

**⚠️ 重要**: 
- パスワードは8文字以上にしてください
- 英数字と記号を含む強力なパスワードを推奨
- このパスワードは後で使用します（メモしておいてください）

---

## 📋 ステップ3: Terraformの初期化

### 3.1 初期化の実行

```powershell
terraform init
```

**期待される出力**:
```
Initializing the backend...
Initializing provider plugins...
Terraform has been successfully initialized!
```

---

## 📋 ステップ4: 実行計画の確認

### 4.1 プランの確認

```powershell
terraform plan
```

**確認事項**:
- 作成されるリソースが正しいか
- リージョンが`ap-northeast-1`（東京）か
- インスタンスクラスが`db.t3.micro`（無料枠）か

**エラーが出た場合**:
- AWS認証情報が正しいか確認
- IAMユーザーに必要な権限があるか確認

---

## 📋 ステップ5: リソースの作成

### 5.1 リソースの作成

```powershell
terraform apply
```

**確認プロンプト**:
```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value:
```

`yes`と入力してEnterを押します。

**作成時間**: 約5-10分かかります。

### 5.2 出力情報の確認

作成が完了すると、以下のような出力が表示されます：

```
Outputs:

db_endpoint = "gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432"
db_port = 5432
db_name = "gacha_lab"
db_username = "postgres"
database_url = "postgresql://postgres:YourSecurePassword123!@gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require"
```

**⚠️ 重要**: この出力をコピーして保存してください（特に`database_url`）。

---

## 📋 ステップ6: 環境変数の設定

### 6.1 アプリディレクトリに移動

```powershell
cd C:\Users\sato akihiro\Desktop\test-app\Gacha_Lab\app
```

### 6.2 .env.localファイルの編集

`.env.local`ファイルを開いて、`DATABASE_URL`を追加または更新：

```env
# 既存の設定
NEXT_PUBLIC_LIFF_ID=2008642684-d8jPmggE
NEXT_PUBLIC_ADMIN_PASSWORD=admin

# AWS RDS PostgreSQL（terraform applyの出力からコピー）
DATABASE_URL="postgresql://postgres:YourSecurePassword123!@gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require"
```

**注意**: 
- `YourSecurePassword123!`は`terraform.tfvars`で設定したパスワードに置き換えてください
- `xxxxxxxxxxxx`は実際のエンドポイントに置き換えてください
- `sslmode=require`は必須です（AWS RDSはSSL接続を要求します）

---

## 📋 ステップ7: 接続テスト

### 7.1 Prismaクライアントの再生成

```powershell
npm run db:generate
```

### 7.2 接続テスト（オプション）

PostgreSQLクライアントがインストールされている場合：

```powershell
psql -h gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com -U postgres -d gacha_lab
```

パスワードを入力して接続できることを確認します。

---

## 📋 ステップ8: マイグレーションの実行

### 8.1 マイグレーションの実行

```powershell
npm run db:migrate
```

**期待される出力**:
```
Prisma Migrate applied the following migration(s):
migrations/
  YYYYMMDDHHMMSS_init/
    migration.sql
```

### 8.2 シードデータの投入

```powershell
npm run db:seed
```

**期待される出力**:
```
Seeding...
✅ Gacha types created
✅ Gacha items created
Seeding completed!
```

---

## 📋 ステップ9: 動作確認

### 9.1 Prisma Studioで確認

```powershell
npm run db:studio
```

ブラウザで `http://localhost:5555` が開き、データベースの内容を確認できます。

### 9.2 アプリケーションの起動

```powershell
npm run dev
```

アプリケーションが正常に起動し、データベースに接続できることを確認します。

---

## 🔧 トラブルシューティング

### エラー: "Error: error creating DB Instance"

**原因**: 
- AWSアカウントのクレジットカード情報が未登録
- 無料枠の制限を超えている
- リージョンが間違っている

**解決方法**:
- AWSマネジメントコンソールでクレジットカード情報を確認
- リージョンが`ap-northeast-1`か確認

---

### エラー: "Error: InvalidParameterValue"

**原因**: 
- パスワードが8文字未満
- インスタンスクラスが無料枠外

**解決方法**:
- `terraform.tfvars`のパスワードを8文字以上に変更
- `main.tf`のインスタンスクラスが`db.t3.micro`か確認

---

### エラー: "Can't reach database server"

**原因**: 
- セキュリティグループの設定が間違っている
- エンドポイントが間違っている
- パスワードが間違っている

**解決方法**:
- `terraform.tfvars`のパスワードを確認
- `.env.local`の`DATABASE_URL`を確認
- `sslmode=require`が含まれているか確認

---

### エラー: "SSL connection required"

**原因**: 
- `DATABASE_URL`に`sslmode=require`が含まれていない

**解決方法**:
- `.env.local`の`DATABASE_URL`に`?sslmode=require`を追加

---

## 🗑️ リソースの削除（必要に応じて）

### すべてのリソースを削除

```powershell
cd C:\Users\sato akihiro\Desktop\test-app\Gacha_Lab\terraform
terraform destroy
```

**⚠️ 注意**: このコマンドはすべてのリソース（データベース、セキュリティグループなど）を削除します。データは復元できません。

---

## ✅ 完了チェックリスト

- [ ] AWS CLIがインストール・設定されている
- [ ] Terraformがインストールされている
- [ ] `terraform.tfvars`が作成され、パスワードが設定されている
- [ ] `terraform init`が成功した
- [ ] `terraform plan`が成功した
- [ ] `terraform apply`が成功し、RDSが作成された
- [ ] `.env.local`に`DATABASE_URL`が設定されている
- [ ] `npm run db:migrate`が成功した
- [ ] `npm run db:seed`が成功した
- [ ] Prisma Studioでデータが確認できる
- [ ] アプリケーションが正常に起動する

---

## 📚 参考

- [Terraform README](../../terraform/README.md)
- [AWSデータベース設定手順](./11_AWSデータベース設定.md)
- [AWS AmplifyとRDSの関係](./14_AWS_AmplifyとRDSの関係.md)

