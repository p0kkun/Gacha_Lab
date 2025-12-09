# AWS データベース設定手順

## 概要

AWS の無料枠を使用して PostgreSQL データベースをセットアップする手順です。

**対象サービス**: AWS RDS PostgreSQL（無料枠あり）

**構築方法**:
- **手動構築**: このドキュメントの手順に従ってAWSコンソールから構築
- **Terraform構築**: `../terraform/README.md` を参照（推奨・一括構築可能）

---

## 1. AWS アカウントの準備

### 1.1 AWS アカウントの作成

1. [AWS](https://aws.amazon.com/jp/) にアクセス
2. 「AWS アカウントを作成」をクリック
3. メールアドレスで登録
4. クレジットカード情報を入力（無料枠内では課金されません）
5. 電話番号認証を完了

### 1.2 AWS 無料枠の確認

- **RDS PostgreSQL**: 750時間/月（12ヶ月間）
- **ストレージ**: 20GB（12ヶ月間）
- **データ転送**: 15GB/月（12ヶ月間）

**注意**: 無料枠を超えると課金されます。使用量に注意してください。

---

## 2. RDS PostgreSQL インスタンスの作成

### 2.1 RDS コンソールにアクセス

1. AWS マネジメントコンソールにログイン
2. 検索バーで「RDS」を検索
3. 「RDS」をクリック

### 2.2 データベースの作成

1. 「データベースの作成」をクリック
2. 以下の設定を選択：

#### データベース作成方法
- **標準作成** を選択

#### エンジンのオプション
- **PostgreSQL** を選択
- **バージョン**: `PostgreSQL 16.x` または最新の安定版

#### テンプレート
- **無料利用枠** を選択（重要！）

#### 設定
- **DB インスタンス識別子**: `gacha-lab-db`
- **マスターユーザー名**: `postgres`（または任意のユーザー名）
- **マスターパスワード**: 強力なパスワードを設定（後で使用します）
  - 例: `YourSecurePassword123!`

#### インスタンス構成
- **DB インスタンスクラス**: `db.t3.micro`（無料枠）
- **ストレージ**: `20 GB`（無料枠）

#### 接続
- **パブリックアクセス**: **はい** を選択（開発環境の場合）
- **VPC**: デフォルトVPC
- **DB サブネットグループ**: デフォルト
- **セキュリティグループ**: 新規作成
  - 名前: `gacha-lab-db-sg`
  - インバウンドルール: PostgreSQL（ポート5432）を追加
    - タイプ: PostgreSQL
    - ソース: `0.0.0.0/0`（開発環境のみ。本番環境では制限してください）

#### データベース認証
- **パスワード認証** を選択

#### 追加設定
- **初期データベース名**: `gacha_lab`
- **バックアップ保持期間**: `7日`（無料枠内）
- **暗号化**: オフ（無料枠では不要）

### 2.3 データベースの作成開始

1. 「データベースの作成」をクリック
2. 作成には約5-10分かかります
3. ステータスが「利用可能」になるまで待機

---

## 3. 接続情報の取得

### 3.1 エンドポイントの確認

1. RDS コンソールで作成したデータベースを選択
2. 「接続とセキュリティ」タブを開く
3. **エンドポイント** をコピー
   - 例: `gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com`
4. **ポート**: `5432`（デフォルト）

### 3.2 接続情報のまとめ

以下の情報をメモしてください：

```
エンドポイント: gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
ポート: 5432
データベース名: gacha_lab
ユーザー名: postgres
パスワード: YourSecurePassword123!
```

---

## 4. セキュリティグループの設定確認

### 4.1 インバウンドルールの確認

1. RDS コンソールでデータベースを選択
2. 「接続とセキュリティ」タブを開く
3. セキュリティグループ名をクリック
4. 「インバウンドルール」タブを確認
5. PostgreSQL（ポート5432）のルールが追加されていることを確認

### 4.2 開発環境での注意事項

- 現在は `0.0.0.0/0`（すべてのIP）からアクセス可能
- 本番環境では、特定のIPアドレスのみ許可することを推奨
- または、VPC内からのみアクセス可能にする

---

## 5. ローカル環境での接続テスト

### 5.1 psql のインストール（Windows）

```powershell
# PostgreSQL をインストール（psql が含まれます）
# https://www.postgresql.org/download/windows/
```

または、Docker を使用：

```powershell
docker run -it --rm postgres:16 psql -h gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com -U postgres -d gacha_lab
```

### 5.2 接続テスト

```powershell
psql -h gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com -U postgres -d gacha_lab
```

パスワードを入力して接続できることを確認します。

---

## 6. 環境変数の設定

### 6.1 DATABASE_URL の構築

接続文字列の形式：

```
postgresql://[ユーザー名]:[パスワード]@[エンドポイント]:[ポート]/[データベース名]?sslmode=require
```

例：

```
postgresql://postgres:YourSecurePassword123!@gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require
```

### 6.2 `.env.local` に追加

プロジェクトルート（`app/`ディレクトリ）の`.env.local`ファイルに追加：

```env
# データベース設定（AWS RDS PostgreSQL）
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@gacha-lab-db.xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require
```

**⚠️ 重要**: `.env.local`は`.gitignore`に含まれていることを確認してください。

---

## 7. Prisma の設定確認

### 7.1 Prisma スキーマの確認

`prisma/schema.prisma` の `datasource` が正しく設定されていることを確認：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 7.2 Prisma クライアントの生成

```powershell
cd app
npm run db:generate
```

### 7.3 マイグレーションの実行

```powershell
npm run db:migrate
```

### 7.4 シードデータの投入

```powershell
npm run db:seed
```

---

## 8. 接続確認

### 8.1 Prisma Studio で確認

```powershell
npm run db:studio
```

ブラウザで `http://localhost:5555` にアクセスして、データベースの内容を確認します。

### 8.2 アプリケーションからの接続確認

開発サーバーを起動：

```powershell
npm run dev
```

エラーが発生しないことを確認します。

---

## 9. コスト管理

### 9.1 無料枠の確認

- **RDS PostgreSQL**: 750時間/月（12ヶ月間）
- **ストレージ**: 20GB（12ヶ月間）
- **データ転送**: 15GB/月（12ヶ月間）

### 9.2 コスト監視

1. AWS マネジメントコンソールで「請求」を確認
2. 「コストエクスプローラー」で使用量を監視
3. 無料枠を超えないように注意

### 9.3 不要な場合は停止

開発が終わったら、データベースインスタンスを停止または削除してください：

1. RDS コンソールでデータベースを選択
2. 「アクション」→「停止」または「削除」

**注意**: 削除するとデータは復元できません。

---

## 10. トラブルシューティング

### 10.1 接続できない

- セキュリティグループの設定を確認
- エンドポイントが正しいか確認
- パスワードが正しいか確認
- ネットワーク接続を確認

### 10.2 SSL エラー

- `sslmode=require` を接続文字列に追加
- または、`sslmode=prefer` を試す

### 10.3 タイムアウトエラー

- セキュリティグループでポート5432が開いているか確認
- VPCの設定を確認

---

## 11. 本番環境への移行

### 11.1 セキュリティの強化

- セキュリティグループを特定のIPアドレスのみ許可に変更
- VPC内からのみアクセス可能にする
- 強力なパスワードを使用
- 定期的にバックアップを取得

### 11.2 パフォーマンスの最適化

- 必要に応じてインスタンスタイプをアップグレード
- インデックスの最適化
- クエリの最適化

---

## 確認項目

- [ ] AWS アカウントを作成した
- [ ] RDS PostgreSQL インスタンスを作成した
- [ ] 無料枠テンプレートを選択した
- [ ] エンドポイントを取得した
- [ ] セキュリティグループを設定した
- [ ] `.env.local`に`DATABASE_URL`を設定した
- [ ] Prisma マイグレーションを実行した
- [ ] シードデータを投入した
- [ ] 接続確認が完了した

---

## 次のステップ

- [12_AWS_デプロイ設定.md](./12_AWS_デプロイ設定.md) に進む（今後作成予定）
- [DB物理設計_実装手順.md](../DB物理設計_実装手順.md) でローカル環境の設定を確認

---

## 参考資料

- [AWS RDS ドキュメント](https://aws.amazon.com/jp/rds/postgresql/)
- [AWS 無料利用枠](https://aws.amazon.com/jp/free/)
- [Prisma PostgreSQL ドキュメント](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [AWS RDS 料金](https://aws.amazon.com/jp/rds/pricing/)

