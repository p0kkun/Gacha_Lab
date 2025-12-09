# ローカルデータベース構築スクリプト

## 概要

`setup-local-db.ps1`は、ローカル開発環境のデータベース構築を自動化するPowerShellスクリプトです。

このスクリプトは以下の処理を自動で実行します：

1. PostgreSQL接続確認
2. データベース`gacha_lab`の存在確認と作成
3. `.env.local`の存在確認
4. npmパッケージのインストール
5. Prismaクライアントの生成
6. データベースマイグレーション
7. シードデータの投入

## 使用方法

### 基本的な使用方法

```powershell
cd Gacha_Lab/app
.\setup-local-db.ps1
```

### カスタムパラメータを使用

```powershell
# PostgreSQLのパスワードを指定
.\setup-local-db.ps1 -PostgresPassword "your_password"

# すべてのパラメータを指定
.\setup-local-db.ps1 `
  -PostgresPassword "your_password" `
  -PostgresUser "postgres" `
  -PostgresHost "localhost" `
  -PostgresPort 5432 `
  -DatabaseName "gacha_lab"
```

### パラメータ一覧

| パラメータ | デフォルト値 | 説明 |
|-----------|------------|------|
| `-PostgresPassword` | `postgres` | PostgreSQLのパスワード |
| `-PostgresUser` | `postgres` | PostgreSQLのユーザー名 |
| `-PostgresHost` | `localhost` | PostgreSQLのホスト名 |
| `-PostgresPort` | `5432` | PostgreSQLのポート番号 |
| `-DatabaseName` | `gacha_lab` | 作成するデータベース名 |

## 前提条件

### 1. PostgreSQLが起動していること

**方法1: PostgreSQLを直接インストールした場合**

- PostgreSQLサービスが起動していることを確認
- Windowsのサービス管理から「postgresql-x64-XX」サービスを確認

**方法2: Dockerを使用する場合**

```powershell
docker start gacha-lab-postgres
```

または、コンテナが存在しない場合は作成：

```powershell
docker run --name gacha-lab-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=gacha_lab `
  -p 5432:5432 `
  -d postgres:16
```

### 2. Node.jsがインストールされていること

```powershell
node --version
# v20以上が推奨
```

### 3. PowerShellの実行ポリシー

初回実行時、PowerShellの実行ポリシーによってはエラーが発生する場合があります。

**現在の実行ポリシーを確認：**

```powershell
Get-ExecutionPolicy
```

**実行ポリシーを変更（管理者権限が必要）：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

または、一時的に実行ポリシーをバイパス：

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-local-db.ps1
```

## 実行例

### 正常な実行例

```powershell
PS C:\Users\sato akihiro\Desktop\test-app\Gacha_Lab\app> .\setup-local-db.ps1

========================================
ローカルデータベース構築スクリプト
========================================

[1/7] PostgreSQL接続確認中...
✅ PostgreSQL接続成功
[2/7] データベース 'gacha_lab' の確認中...
✅ データベース 'gacha_lab' は既に存在します
[3/7] 環境変数ファイルの確認中...
✅ .env.local が見つかりました
[4/7] npmパッケージのインストール中...
✅ node_modules は既に存在します（スキップ）
[5/7] Prismaクライアントの生成中...
✅ Prismaクライアントの生成が完了しました
[6/7] データベースマイグレーション実行中...
✅ マイグレーションが完了しました
[7/7] シードデータの投入中...
✅ シードデータの投入が完了しました

========================================
🎉 ローカルデータベース構築が完了しました！
========================================
```

## トラブルシューティング

### PostgreSQL接続エラー

**エラー**: `PostgreSQLへの接続に失敗しました`

**解決方法**:
1. PostgreSQLが起動しているか確認
2. パスワードが正しいか確認
3. ポート番号が正しいか確認

### マイグレーションエラー

**エラー**: `マイグレーションに失敗しました`

**解決方法**:
1. `.env.local`の`DATABASE_URL`が正しいか確認
2. データベースが存在するか確認
3. 既存のマイグレーションを確認：`npx prisma migrate status`

### シードデータ投入エラー

**エラー**: `シードデータの投入に失敗しました`

**解決方法**:
1. マイグレーションが正常に完了しているか確認
2. データベース接続を確認
3. 手動で実行：`npm run db:seed`

## 手動実行

スクリプトを使用せず、手動で実行する場合：

```powershell
# 1. データベース作成
$env:PGPASSWORD="postgres"
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE gacha_lab;"

# 2. npmパッケージインストール
npm install

# 3. Prismaクライアント生成
npm run db:generate

# 4. マイグレーション
npm run db:migrate -- --name init

# 5. シードデータ投入
npm run db:seed
```

## 次のステップ

構築が完了したら、以下を実行できます：

```powershell
# Prisma Studioでデータベースを確認
npm run db:studio

# 開発サーバーを起動
npm run dev
```

## 関連ドキュメント

- [ローカルデータベース構築手順](./docs/12_ローカルデータベース構築.md)
- [DB物理設計実装手順](./DB物理設計_実装手順.md)
- [ローカルDB構築クイックスタート](./ローカルDB構築_クイックスタート.md)


