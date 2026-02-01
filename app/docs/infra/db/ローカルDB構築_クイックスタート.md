# ローカルDB構築 - クイックスタート

## 推奨方法: PostgreSQLを直接インストール（Docker不要）

Docker Desktopは必須ではありません。PostgreSQLを直接インストールする方法が最もシンプルです。

### 手順

1. **PostgreSQLをダウンロード**
   - [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からインストーラーをダウンロード

2. **インストール**
   - インストーラーを実行
   - パスワードを設定（例: `postgres`）
   - ポートは`5432`のまま

3. **データベースの作成**

```powershell
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE gacha_lab;

# 接続を終了
\q
```

4. **環境変数の設定**

`.env.local`ファイルに以下を追加：

```env
DATABASE_URL="postgresql://postgres:あなたのパスワード@localhost:5432/gacha_lab?schema=public"
```

---

## オプション: Docker Desktopを使用

### 手順

1. **Docker Desktopを起動**
   - Windowsのスタートメニューから「Docker Desktop」を起動
   - 起動完了まで待機（数分かかる場合があります）

2. **PostgreSQLコンテナを起動**

```powershell
docker run --name gacha-lab-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=gacha_lab `
  -p 5432:5432 `
  -d postgres:16
```

3. **コンテナの状態確認**

```powershell
docker ps
```

4. **接続確認**

```powershell
docker exec -it gacha-lab-postgres psql -U postgres -d gacha_lab
```

接続できたら、`\q`で終了します。

---

Docker Desktopが既にインストールされている場合は、こちらも使用できます。

---

## 次のステップ

PostgreSQLが起動したら、以下を実行：

```powershell
cd Gacha_Lab/app

# Prismaクライアントの生成
npm run db:generate

# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed

# Prisma Studioで確認
npm run db:studio
```

---

## トラブルシューティング

### Docker Desktopが起動しない

- Docker Desktopがインストールされているか確認
- Windowsの再起動を試す
- 方法2（直接インストール）を使用

### ポート5432が既に使用されている

- 既存のPostgreSQLインスタンスを停止
- または、別のポートを使用（例: `-p 5433:5432`）

---

詳細は [docs/12_ローカルデータベース構築.md](./docs/12_ローカルデータベース構築.md) を参照してください。

