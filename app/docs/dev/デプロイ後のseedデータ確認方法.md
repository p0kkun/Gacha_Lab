# デプロイ後のseedデータ確認方法

## 概要

AWS Amplifyにデプロイした後、データベースにseedデータが投入されているか確認する方法を説明します。

## 現在の状況

デプロイログを見ると、以下のメッセージが表示されています：

```
ℹ️  RUN_SEEDが設定されていないため、シードデータの投入をスキップします
```

これは、`RUN_SEED`環境変数が設定されていないため、seedデータが投入されていないことを意味します。

## 解決方法

### 方法1: AWS Amplifyの環境変数でseedデータを投入（推奨）

1. **AWS Amplifyコンソールにアクセス**
   - https://console.aws.amazon.com/amplify/ にアクセス
   - 該当するアプリを選択

2. **環境変数を設定**
   - 左メニューから「環境変数」を選択
   - 「環境変数の管理」をクリック
   - 以下の環境変数を追加：
     ```
     キー: RUN_SEED
     値: true
     ```
   - 「保存」をクリック

3. **再デプロイ**
   - 「再デプロイ」ボタンをクリック
   - または、新しいコミットをプッシュ

4. **デプロイログを確認**
   - デプロイログで以下のメッセージが表示されることを確認：
     ```
     🌱 シードデータを投入中...
     ```

### 方法2: 手動でseedデータを投入

AWS Amplifyの環境変数で`RUN_SEED`を設定できない場合、手動でseedデータを投入できます。

#### 2.1 ローカルからデータベースに接続

1. **データベース接続情報を取得**
   - AWS RDSコンソールからデータベースのエンドポイントを確認
   - 接続情報（ホスト、ポート、データベース名、ユーザー名、パスワード）を確認

2. **環境変数を設定**
   - `.env.local`ファイルに以下を追加：
     ```env
     DATABASE_URL="postgresql://ユーザー名:パスワード@エンドポイント:5432/gacha_lab?schema=public"
     ```

3. **seedデータを投入**
   ```powershell
   cd Gacha_Lab/app
   npm run db:seed
   ```

#### 2.2 AWS Systems Manager Session Managerを使用（推奨）

AWS Systems Manager Session Managerを使用して、EC2インスタンスやECSタスクからデータベースに接続できます。

## seedデータの確認方法

### 方法1: APIエンドポイントで確認

デプロイ後のアプリケーションのAPIエンドポイントを使用して、データを確認できます。

#### ガチャタイプの確認

```bash
curl https://your-amplify-app.amplifyapp.com/api/gacha/types
```

または、ブラウザで以下のURLにアクセス：
```
https://your-amplify-app.amplifyapp.com/api/gacha/types
```

期待されるレスポンス：
```json
{
  "gachaTypes": [
    {
      "id": "normal",
      "name": "通常ガチャ",
      "description": "通常のガチャです",
      "pointCost": 100,
      "isActive": true,
      "startAt": null,
      "endAt": null
    },
    {
      "id": "premium",
      "name": "プレミアムガチャ",
      "description": "プレミアムガチャです",
      "pointCost": 300,
      "isActive": true,
      "startAt": null,
      "endAt": null
    }
  ]
}
```

#### ガチャアイテムの確認

```bash
curl https://your-amplify-app.amplifyapp.com/api/gacha/items
```

### 方法2: データベースに直接接続して確認

#### 2.1 AWS RDSコンソールから確認

1. **AWS RDSコンソールにアクセス**
   - https://console.aws.amazon.com/rds/ にアクセス
   - 該当するデータベースインスタンスを選択

2. **Query Editorを使用**
   - 「Query Editor」を選択
   - データベースに接続
   - 以下のクエリを実行：

```sql
-- ガチャタイプの確認
SELECT * FROM gacha_types;

-- ガチャアイテムの確認
SELECT * FROM gacha_items;

-- レコード数の確認
SELECT COUNT(*) FROM gacha_types;
SELECT COUNT(*) FROM gacha_items;
```

#### 2.2 ローカルからpsqlで接続

1. **PostgreSQLクライアントをインストール**
   - PostgreSQLをインストール（psqlコマンドが使用可能）

2. **データベースに接続**
   ```powershell
   psql -h エンドポイント -U ユーザー名 -d gacha_lab
   ```

3. **データを確認**
   ```sql
   -- ガチャタイプの確認
   SELECT * FROM gacha_types;
   
   -- ガチャアイテムの確認
   SELECT * FROM gacha_items;
   
   -- レコード数の確認
   SELECT COUNT(*) FROM gacha_types;
   SELECT COUNT(*) FROM gacha_items;
   ```

### 方法3: Prisma Studioを使用（ローカル環境のみ）

ローカル環境からデータベースに接続できる場合、Prisma Studioを使用してデータを確認できます。

1. **環境変数を設定**
   ```env
   DATABASE_URL="postgresql://ユーザー名:パスワード@エンドポイント:5432/gacha_lab?schema=public"
   ```

2. **Prisma Studioを起動**
   ```powershell
   cd Gacha_Lab/app
   npm run db:studio
   ```

3. **ブラウザで確認**
   - `http://localhost:5555` にアクセス
   - テーブルを選択してデータを確認

## 期待されるseedデータ

### ガチャタイプ

- **通常ガチャ** (`id: "normal"`)
  - ポイントコスト: 100ポイント
  - 開始日時: null（期間制限なし）
  - 終了日時: null（期間制限なし）

- **プレミアムガチャ** (`id: "premium"`)
  - ポイントコスト: 300ポイント
  - 開始日時: null（期間制限なし）
  - 終了日時: null（期間制限なし）

### ガチャアイテム

各ガチャタイプに対して、以下のレアリティのアイテムが作成されます：

- 1等（FIRST_PRIZE）
- 2等（SECOND_PRIZE）
- 3等（THIRD_PRIZE）
- 4等（FOURTH_PRIZE）
- 5等（FIFTH_PRIZE）
- ハズレ（LOSER）

## トラブルシューティング

### seedデータが投入されない場合

1. **環境変数の確認**
   - `RUN_SEED=true`が設定されているか確認
   - `DATABASE_URL`が正しく設定されているか確認

2. **デプロイログの確認**
   - AWS Amplifyのデプロイログでエラーメッセージを確認
   - `🌱 シードデータを投入中...` のメッセージが表示されているか確認

3. **データベース接続の確認**
   - データベースが正常に起動しているか確認
   - セキュリティグループの設定を確認（ポート5432が開いているか）

4. **手動でseedデータを投入**
   - 方法2を参照して、手動でseedデータを投入

### データが重複している場合

seedスクリプトは`upsert`を使用しているため、既存のデータは更新され、新しいデータのみが作成されます。重複を心配する必要はありません。

## 関連ファイル

- `prisma/seed.ts` - seedデータのスクリプト
- `amplify.yml` - デプロイ設定ファイル





