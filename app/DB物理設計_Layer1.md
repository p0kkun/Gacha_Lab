# DB 物理設計 - Layer 1（2 月 26 日までに必須）

## 概要

Layer 1（ガチャ基盤 MVP）で必要なデータベースの物理設計です。

**データベース**: PostgreSQL  
**ORM**: Prisma  
**スキーマファイル**: `prisma/schema.prisma`

---

## テーブル一覧

### Layer 1 で必要なテーブル

1. **users** - ユーザー情報
2. **gacha_items** - ガチャアイテム
3. **gacha_types** - ガチャタイプ
4. **gacha_histories** - 抽選履歴
5. **referral_histories** - 友達紹介履歴
6. **free_gacha_histories** - 無料ガチャ付与履歴

---

## 1. users（ユーザー）

### テーブル定義

| カラム名     | 型        | 制約     | 説明                 |
| ------------ | --------- | -------- | -------------------- |
| user_id      | VARCHAR   | PK       | LINE ユーザー ID     |
| display_name | VARCHAR   | NULL 可  | 表示名               |
| picture_url  | VARCHAR   | NULL 可  | プロフィール画像 URL |
| created_at   | TIMESTAMP | NOT NULL | 初回アクセス日時     |
| updated_at   | TIMESTAMP | NOT NULL | 最終更新日時         |

### インデックス

- `idx_users_created_at`: `created_at`

### 用途

- ユーザー情報の保存（LIFF から取得）
- 友達紹介システムでのユーザー識別
- ユーザー別の統計や機能拡張

---

## 2. gacha_items（ガチャアイテム）

### テーブル定義

| カラム名   | 型        | 制約     | 説明                                |
| ---------- | --------- | -------- | ----------------------------------- |
| id         | SERIAL    | PK       | アイテム ID                         |
| name       | VARCHAR   | NOT NULL | アイテム名                          |
| rarity     | ENUM      | NOT NULL | レアリティ（1 等〜5 等、ハズレ）    |
| video_url  | VARCHAR   | NOT NULL | 動画ファイルのパス                  |
| is_active  | BOOLEAN   | NOT NULL | 有効/無効フラグ（デフォルト: true） |
| created_at | TIMESTAMP | NOT NULL | 作成日時                            |
| updated_at | TIMESTAMP | NOT NULL | 更新日時                            |

### レアリティ（Rarity Enum）

- `FIRST_PRIZE`: 1 等 - MAIN EVENT 無料 voucher
- `SECOND_PRIZE`: 2 等 - INVITATION 無料 voucher
- `THIRD_PRIZE`: 3 等 - 5000 円 OFF voucher
- `FOURTH_PRIZE`: 4 等 - 3000 円 OFF voucher
- `FIFTH_PRIZE`: 5 等 - 1000 円 OFF voucher
- `LOSER`: ハズレ - なし（敗者復活ガチャへ誘導）

### インデックス

- `idx_gacha_items_rarity_is_active`: `rarity`, `is_active`
- `idx_gacha_items_is_active`: `is_active`

### 用途

- ガチャ抽選時に使用
- 管理画面で追加・編集・削除

---

## 3. gacha_types（ガチャタイプ）

### テーブル定義

| カラム名            | 型        | 制約     | 説明                                       |
| ------------------- | --------- | -------- | ------------------------------------------ |
| id                  | VARCHAR   | PK       | ガチャタイプ ID（例: 'normal', 'premium'） |
| name                | VARCHAR   | NOT NULL | ガチャ名                                   |
| description         | VARCHAR   | NULL 可  | 説明文                                     |
| first_prize_weight  | INTEGER   | NOT NULL | 1 等確率（%）                              |
| second_prize_weight | INTEGER   | NOT NULL | 2 等確率（%）                              |
| third_prize_weight  | INTEGER   | NOT NULL | 3 等確率（%）                              |
| fourth_prize_weight | INTEGER   | NOT NULL | 4 等確率（%）                              |
| fifth_prize_weight  | INTEGER   | NOT NULL | 5 等確率（%）                              |
| loser_weight        | INTEGER   | NOT NULL | ハズレ確率（%）                            |
| is_active           | BOOLEAN   | NOT NULL | 有効/無効フラグ（デフォルト: true）        |
| created_at          | TIMESTAMP | NOT NULL | 作成日時                                   |
| updated_at          | TIMESTAMP | NOT NULL | 更新日時                                   |

### 制約

- `first_prize_weight + second_prize_weight + third_prize_weight + fourth_prize_weight + fifth_prize_weight + loser_weight = 100`

### インデックス

- `idx_gacha_types_is_active`: `is_active`

### 用途

- ガチャ選択画面で表示
- 抽選時の確率計算に使用
- 管理画面で確率を調整

### 初期データ

- `normal`: 通常ガチャ
- `premium`: プレミアムガチャ

---

## 4. gacha_histories（抽選履歴）

### テーブル定義

| カラム名      | 型        | 制約         | 説明             |
| ------------- | --------- | ------------ | ---------------- |
| id            | SERIAL    | PK           | 履歴 ID          |
| user_id       | VARCHAR   | NOT NULL, FK | LINE ユーザー ID |
| gacha_type_id | VARCHAR   | NOT NULL, FK | ガチャタイプ ID  |
| item_id       | INTEGER   | NOT NULL, FK | 獲得アイテム ID  |
| created_at    | TIMESTAMP | NOT NULL     | 抽選日時         |

### 外部キー

- `user_id` → `users.user_id`
- `gacha_type_id` → `gacha_types.id`
- `item_id` → `gacha_items.id`

### インデックス

- `idx_gacha_histories_user_created`: `user_id`, `created_at`
- `idx_gacha_histories_type_created`: `gacha_type_id`, `created_at`
- `idx_gacha_histories_item`: `item_id`
- `idx_gacha_histories_created`: `created_at`

### 用途

- 抽選履歴の保存
- 管理画面で統計表示
- ユーザーの獲得アイテム一覧（将来的に）

---

## 5. referral_histories（友達紹介履歴）

### テーブル定義

| カラム名          | 型        | 制約             | 説明                                  |
| ----------------- | --------- | ---------------- | ------------------------------------- |
| id                | SERIAL    | PK               | 紹介履歴 ID                           |
| referrer_id       | VARCHAR   | NOT NULL, FK     | 紹介者 ID（LINE ユーザー ID）         |
| referee_id        | VARCHAR   | NULL 可, FK      | 被紹介者 ID（LINE ユーザー ID）       |
| referral_link_id  | VARCHAR   | NOT NULL, UNIQUE | 紹介リンク ID（一意、UUID）           |
| referral_link     | VARCHAR   | NOT NULL         | 紹介リンク URL                        |
| ip_address        | VARCHAR   | NULL 可          | 紹介リンクアクセス時の IP             |
| device_info       | VARCHAR   | NULL 可          | デバイス情報（User-Agent など）       |
| status            | ENUM      | NOT NULL         | 紹介ステータス（デフォルト: PENDING） |
| referred_at       | TIMESTAMP | NOT NULL         | 紹介リンクアクセス日時                |
| completed_at      | TIMESTAMP | NULL 可          | 紹介成立日時（初回ガチャ実行時）      |
| expires_at        | TIMESTAMP | NOT NULL         | 紹介リンク有効期限                    |
| is_fraud_detected | BOOLEAN   | NOT NULL         | 不正検知フラグ（デフォルト: false）   |
| fraud_reason      | VARCHAR   | NULL 可          | 不正検知理由                          |
| created_at        | TIMESTAMP | NOT NULL         | 作成日時                              |
| updated_at        | TIMESTAMP | NOT NULL         | 更新日時                              |

### ステータス（ReferralStatus Enum）

- `PENDING`: 紹介リンク生成済み（被紹介者の登録待ち）
- `COMPLETED`: 紹介成立（被紹介者が初回ガチャ実行）
- `INVALID`: 無効（自己紹介、重複紹介など）
- `FRAUD`: 不正検知
- `EXPIRED`: 有効期限切れ

### 外部キー

- `referrer_id` → `users.user_id`
- `referee_id` → `users.user_id`

### インデックス

- `idx_referral_histories_referrer_created`: `referrer_id`, `created_at`
- `idx_referral_histories_referee`: `referee_id`
- `idx_referral_histories_link_id`: `referral_link_id`
- `idx_referral_histories_ip_created`: `ip_address`, `created_at`
- `idx_referral_histories_status`: `status`
- `idx_referral_histories_expires`: `expires_at`

### ユニーク制約

- `unique_referral_pair`: `referrer_id`, `referee_id`（重複紹介防止、referee_id が null でない場合のみ）

### 用途

- 友達紹介の記録
- 不正防止（重複紹介、自己紹介の検知）
- 無料ガチャ付与の判定
- 紹介統計

---

## 6. free_gacha_histories（無料ガチャ付与履歴）

### テーブル定義

| カラム名            | 型        | 制約         | 説明                                |
| ------------------- | --------- | ------------ | ----------------------------------- |
| id                  | SERIAL    | PK           | 付与履歴 ID                         |
| user_id             | VARCHAR   | NOT NULL, FK | ユーザー ID（LINE ユーザー ID）     |
| referral_history_id | INTEGER   | NULL 可, FK  | 紹介履歴 ID                         |
| grant_type          | ENUM      | NOT NULL     | 付与タイプ                          |
| is_used             | BOOLEAN   | NOT NULL     | 使用済みフラグ（デフォルト: false） |
| used_at             | TIMESTAMP | NULL 可      | 使用日時（ガチャ実行時）            |
| expires_at          | TIMESTAMP | NULL 可      | 有効期限                            |
| created_at          | TIMESTAMP | NOT NULL     | 付与日時                            |
| updated_at          | TIMESTAMP | NOT NULL     | 更新日時                            |

### 付与タイプ（FreeGachaGrantType Enum）

- `REFERRER`: 紹介者への付与
- `REFEREE`: 被紹介者への付与

### 外部キー

- `user_id` → `users.user_id`
- `referral_history_id` → `referral_histories.id`

### インデックス

- `idx_free_gacha_histories_user_used`: `user_id`, `is_used`
- `idx_free_gacha_histories_referral`: `referral_history_id`
- `idx_free_gacha_histories_expires`: `expires_at`

### 用途

- 無料ガチャの付与記録
- 使用状況の管理
- 有効期限の管理

---

## リレーション図

```
users (1) ──< (多) gacha_histories
gacha_types (1) ──< (多) gacha_histories
gacha_items (1) ──< (多) gacha_histories

users (1) ──< (多) referral_histories (referrer_id)
users (1) ──< (多) referral_histories (referee_id)

referral_histories (1) ──< (多) free_gacha_histories
users (1) ──< (多) free_gacha_histories
```

---

## 不正防止のための制約

### 1. 重複紹介の防止

- `referral_histories`テーブルで`referrer_id + referee_id`の組み合わせに UNIQUE 制約
- 既に紹介済みの組み合わせは新規登録を拒否

### 2. 自己紹介の防止

- アプリケーション側で`referrer_id === referee_id`をチェック
- 該当する場合は`status = 'INVALID'`、`is_fraud_detected = true`に設定

### 3. 紹介回数制限

- アプリケーション側で紹介者別の月間紹介成立数を集計
- 上限（例: 10 回/月）を超える場合は新規紹介リンク生成を制限

### 4. 異常パターンの検知

- アプリケーション側で同一 IP アドレスから短時間（例: 1 時間以内）に 5 回以上の紹介が発生した場合、`is_fraud_detected = true`に設定
- 管理者にアラート通知

### 5. 紹介リンクの有効期限

- 紹介リンク生成時に`expires_at`を設定（例: 30 日後）
- 有効期限切れのリンクは`status = 'EXPIRED'`に更新

---

## 初期データ

### gacha_types

```sql
-- 通常ガチャ
INSERT INTO gacha_types (id, name, description, first_prize_weight, second_prize_weight, third_prize_weight, fourth_prize_weight, fifth_prize_weight, loser_weight, is_active)
VALUES ('normal', '通常ガチャ', '通常のガチャです', 1, 2, 5, 10, 20, 62, true);

-- プレミアムガチャ
INSERT INTO gacha_types (id, name, description, first_prize_weight, second_prize_weight, third_prize_weight, fourth_prize_weight, fifth_prize_weight, loser_weight, is_active)
VALUES ('premium', 'プレミアムガチャ', 'プレミアムガチャです', 3, 5, 10, 15, 25, 42, true);
```

---

## マイグレーション手順

1. **Prisma スキーマの確認**

   - `prisma/schema.prisma`を確認

2. **マイグレーションファイルの生成**

   ```bash
   npx prisma migrate dev --name init_layer1
   ```

3. **データベースへの適用**

   - マイグレーションが自動的に実行される

4. **Prisma クライアントの生成**

   ```bash
   npx prisma generate
   ```

5. **初期データの投入**
   - シードスクリプトまたは管理画面から投入

---

## 確認項目

- [ ] Prisma スキーマが正しく定義されている
- [ ] すべてのテーブルが作成されている
- [ ] インデックスが正しく設定されている
- [ ] 外部キー制約が正しく設定されている
- [ ] ユニーク制約が正しく設定されている
- [ ] 初期データが投入されている

---

## 参考資料

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [DB_DESIGN.md](../DB_DESIGN.md)
- [要件定義.md](../要件定義.md)



