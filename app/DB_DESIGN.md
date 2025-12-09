# ガチャアプリ データベース設計

## 必要なデータモデル

### 1. **ガチャアイテム（GachaItem）**

ガチャで排出されるアイテムの情報

| カラム    | 型             | 説明                            | 必須 |
| --------- | -------------- | ------------------------------- | ---- |
| id        | Int (PK, Auto) | アイテム ID                     | ✓    |
| name      | String         | アイテム名                      | ✓    |
| rarity    | Enum           | レアリティ (common, rare, epic) | ✓    |
| videoUrl  | String         | 動画ファイルのパス              | ✓    |
| isActive  | Boolean        | 有効/無効フラグ                 | ✓    |
| createdAt | DateTime       | 作成日時                        | ✓    |
| updatedAt | DateTime       | 更新日時                        | ✓    |

**用途：**

- ガチャ抽選時に使用
- 管理画面で追加・編集・削除

---

### 2. **ガチャタイプ（GachaType）**

ガチャの種類（通常ガチャ、プレミアムガチャなど）

| カラム       | 型          | 説明                                      | 必須 |
| ------------ | ----------- | ----------------------------------------- | ---- |
| id           | String (PK) | ガチャタイプ ID (例: 'normal', 'premium') | ✓    |
| name         | String      | ガチャ名                                  | ✓    |
| description  | String      | 説明文                                    | ✓    |
| commonWeight | Int         | コモン確率（%）                           | ✓    |
| rareWeight   | Int         | レア確率（%）                             | ✓    |
| epicWeight   | Int         | エピック確率（%）                         | ✓    |
| isActive     | Boolean     | 有効/無効フラグ                           | ✓    |
| createdAt    | DateTime    | 作成日時                                  | ✓    |
| updatedAt    | DateTime    | 更新日時                                  | ✓    |

**用途：**

- ガチャ選択画面で表示
- 抽選時の確率計算に使用
- 管理画面で確率を調整

**制約：**

- commonWeight + rareWeight + epicWeight = 100

---

### 3. **抽選履歴（GachaHistory）**

ユーザーがガチャを引いた記録

| カラム      | 型             | 説明             | 必須 |
| ----------- | -------------- | ---------------- | ---- |
| id          | Int (PK, Auto) | 履歴 ID          | ✓    |
| userId      | String         | LINE ユーザー ID | ✓    |
| gachaTypeId | String (FK)    | ガチャタイプ ID  | ✓    |
| itemId      | Int (FK)       | 獲得アイテム ID  | ✓    |
| createdAt   | DateTime       | 抽選日時         | ✓    |

**用途：**

- 抽選履歴の保存
- 管理画面で統計表示
- ユーザーの獲得アイテム一覧（将来的に）

**インデックス：**

- userId + createdAt（ユーザー別履歴取得用）
- gachaTypeId + createdAt（ガチャタイプ別統計用）

---

### 4. **ユーザー（User）** - Layer 1 で必要

LINE ユーザーの情報

| カラム      | 型          | 説明                 | 必須 |
| ----------- | ----------- | -------------------- | ---- |
| userId      | String (PK) | LINE ユーザー ID     | ✓    |
| displayName | String      | 表示名               | -    |
| pictureUrl  | String      | プロフィール画像 URL | -    |
| createdAt   | DateTime    | 初回アクセス日時     | ✓    |
| updatedAt   | DateTime    | 最終更新日時         | ✓    |

**用途：**

- ユーザー情報の保存（現在は LIFF から取得）
- 友達紹介システムでのユーザー識別
- ユーザー別の統計や機能拡張

---

### 5. **友達紹介履歴（ReferralHistory）** ⭐ Layer 1 必須

友達紹介の記録と不正防止

| カラム          | 型              | 説明                             | 必須 |
| --------------- | --------------- | -------------------------------- | ---- |
| id              | Int (PK, Auto)  | 紹介履歴 ID                      | ✓    |
| referrerId      | String (FK)     | 紹介者 ID（LINE ユーザー ID）    | ✓    |
| refereeId       | String (FK)     | 被紹介者 ID（LINE ユーザー ID）  | -    |
| referralLinkId  | String (UNIQUE) | 紹介リンク ID（一意）            | ✓    |
| referralLink    | String          | 紹介リンク URL                   | ✓    |
| ipAddress       | String          | 紹介リンクアクセス時の IP        | -    |
| deviceInfo      | String          | デバイス情報（User-Agent など）  | -    |
| status          | Enum            | 紹介ステータス                   | ✓    |
| referredAt      | DateTime        | 紹介リンクアクセス日時           | ✓    |
| completedAt     | DateTime        | 紹介成立日時（初回ガチャ実行時） | -    |
| expiresAt       | DateTime        | 紹介リンク有効期限               | ✓    |
| isFraudDetected | Boolean         | 不正検知フラグ                   | ✓    |
| fraudReason     | String          | 不正検知理由                     | -    |
| createdAt       | DateTime        | 作成日時                         | ✓    |
| updatedAt       | DateTime        | 更新日時                         | ✓    |

**ステータス（Enum）:**

- `pending`: 紹介リンク生成済み（被紹介者の登録待ち）
- `completed`: 紹介成立（被紹介者が初回ガチャ実行）
- `invalid`: 無効（自己紹介、重複紹介など）
- `fraud`: 不正検知
- `expired`: 有効期限切れ

**用途：**

- 友達紹介の記録
- 不正防止（重複紹介、自己紹介の検知）
- 無料ガチャ付与の判定
- 紹介統計

**インデックス：**

- referrerId + createdAt（紹介者別履歴取得用）
- refereeId（被紹介者別検索用）
- referralLinkId（リンク検証用）
- referrerId + refereeId（重複紹介検知用、UNIQUE 制約）
- ipAddress + createdAt（IP 別異常検知用）
- status（ステータス別フィルタリング用）

**制約：**

- referrerId ≠ refereeId（自己紹介防止）
- referrerId + refereeId の組み合わせは一意（重複紹介防止）

---

### 6. **無料ガチャ付与履歴（FreeGachaHistory）** ⭐ Layer 1 必須

友達紹介による無料ガチャの付与記録

| カラム            | 型             | 説明                            | 必須 |
| ----------------- | -------------- | ------------------------------- | ---- |
| id                | Int (PK, Auto) | 付与履歴 ID                     | ✓    |
| userId            | String (FK)    | ユーザー ID（LINE ユーザー ID） | ✓    |
| referralHistoryId | Int (FK)       | 紹介履歴 ID                     | -    |
| grantType         | Enum           | 付与タイプ                      | ✓    |
| isUsed            | Boolean        | 使用済みフラグ                  | ✓    |
| usedAt            | DateTime       | 使用日時（ガチャ実行時）        | -    |
| expiresAt         | DateTime       | 有効期限                        | -    |
| createdAt         | DateTime       | 付与日時                        | ✓    |
| updatedAt         | DateTime       | 更新日時                        | ✓    |

**付与タイプ（Enum）:**

- `referrer`: 紹介者への付与
- `referee`: 被紹介者への付与

**用途：**

- 無料ガチャの付与記録
- 使用状況の管理
- 有効期限の管理

**インデックス：**

- userId + isUsed（ユーザー別未使用無料ガチャ取得用）
- referralHistoryId（紹介履歴との紐付け用）

---

## リレーション

```
GachaType (1) ──< (多) GachaHistory
GachaItem (1) ──< (多) GachaHistory
User (1) ──< (多) GachaHistory
User (1) ──< (多) ReferralHistory (referrerId)
User (1) ──< (多) ReferralHistory (refereeId)
ReferralHistory (1) ──< (多) FreeGachaHistory
User (1) ──< (多) FreeGachaHistory
```

---

## 初期データ

### GachaType

- `normal`: 通常ガチャ（common: 70%, rare: 25%, epic: 5%）
- `premium`: プレミアムガチャ（common: 50%, rare: 35%, epic: 15%）

### GachaItem

- 現在のハードコードされた 5 つのアイテムを移行

---

## 管理画面で必要な機能

1. **ガチャアイテム管理**

   - 一覧表示
   - 追加（動画アップロード含む）
   - 編集
   - 削除（論理削除）
   - 有効/無効の切り替え

2. **ガチャタイプ管理**

   - 一覧表示
   - 確率の調整
   - 説明文の編集

3. **抽選履歴**
   - 一覧表示（ページネーション）
   - フィルタリング（ユーザー、ガチャタイプ、日付）
   - 統計表示（総抽選数、レアリティ別集計）

---

## 友達紹介システムの不正防止ロジック

### 1. 重複紹介の防止

- `ReferralHistory`テーブルで`referrerId + refereeId`の組み合わせに UNIQUE 制約を設定
- 既に紹介済みの組み合わせは新規登録を拒否

### 2. 自己紹介の防止

- 紹介リンクアクセス時に`referrerId === refereeId`をチェック
- 該当する場合は`status = 'invalid'`、`isFraudDetected = true`に設定

### 3. 紹介回数制限

- 紹介者別の月間紹介成立数を集計
- 上限（例: 10 回/月）を超える場合は新規紹介リンク生成を制限

### 4. 異常パターンの検知

- 同一 IP アドレスから短時間（例: 1 時間以内）に 5 回以上の紹介が発生した場合、`isFraudDetected = true`に設定
- 同一デバイス情報からの異常な紹介パターンを検知
- 管理者にアラート通知

### 5. 紹介リンクの有効期限

- 紹介リンク生成時に`expiresAt`を設定（例: 30 日後）
- 有効期限切れのリンクは`status = 'expired'`に更新

### 6. 紹介成立の検証

- 被紹介者が初回ガチャを実行した時点で`status = 'completed'`に更新
- 紹介者と被紹介者の両方に無料ガチャを付与

---

## 検討事項

- [x] ユーザーテーブルは今すぐ必要か？ → **Layer 1 で必要（友達紹介システムで使用）**
- [ ] 動画ファイルの保存方法（public フォルダ vs ストレージサービス）
- [ ] 抽選履歴の保持期間（データ削除ポリシー）
- [ ] ガチャアイテムの並び順（表示順序の管理）
- [ ] 紹介者への無料ガチャ付与上限（月間制限など）
- [ ] 紹介リンクの有効期限（現在は 30 日を想定）
