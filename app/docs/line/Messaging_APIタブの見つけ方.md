# 「Messaging API」タブの見つけ方

## 問題

LINE Developers Console で「Messaging API」タブが見当たらない場合、現在表示しているチャネルが**LINE ミニアプリチャネル**であり、**Messaging API チャネル**ではない可能性があります。

---

## 解決方法

### 方法 1: LINE 公式アカウントから Messaging API を有効化（推奨）

**2024 年 9 月 4 日以降、LINE Developers Console から直接 Messaging API チャネルを作成することはできなくなりました。**

新しい手順：

#### ステップ 1: LINE 公式アカウントを作成

1. [LINE Official Account Manager](https://account.line.biz/) にアクセス
2. LINE アカウントでログイン
3. 「新規作成」をクリック
4. **アカウント名**: 任意（例: `Gacha Lab`）
5. 「作成」をクリック

#### ステップ 2: Messaging API を有効化

1. LINE Official Account Manager で作成した公式アカウントを選択
2. **右上の「設定」アイコン（歯車アイコン）**をクリック
3. 設定メニューから「Messaging API」を選択
4. 「Messaging API を利用する」を**有効化**
5. これにより、LINE Developers Console に**Messaging API チャネルが自動的に作成**されます

**注意**:

- 左側のメニューではなく、**右上の「設定」アイコン**からアクセスします
- 現在リッチメニュー設定画面にいる場合、右上の「設定」アイコンをクリックしてください

#### ステップ 3: LINE Developers Console で Messaging API チャネルを確認

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 左側のプロバイダー一覧を確認
3. **新しく作成された Messaging API チャネル**を探す
   - チャネル名は、LINE 公式アカウントの名前と同じになります
   - チャネルタイプが「Messaging API」と表示されます

#### ステップ 4: 「Messaging API」タブを確認

1. 作成された Messaging API チャネルをクリック
2. チャネル設定画面で、上部のタブを確認
3. **「Messaging API」タブ**が表示されているはずです

---

## チャネルの種類

### LINE ミニアプリチャネル（現在表示しているチャネル）

- **チャネル名**: 「Gacha Lab テストアプリ」
- **チャネルタイプ**: LINE ミニアプリ
- **表示されるタブ**:
  - チャネル基本設定
  - ウェブアプリ設定
  - 審査申請
  - 事業情報
  - 連絡先情報
  - サービスメッセージテンプレート
  - 権限設定
- **「Messaging API」タブ**: ❌ 表示されない

### Messaging API チャネル（必要なチャネル）

- **チャネル名**: LINE 公式アカウントの名前（例: 「Gacha Lab」）
- **チャネルタイプ**: Messaging API
- **表示されるタブ**:
  - 基本設定
  - **Messaging API** ⭐
  - リッチメニュー
  - その他
- **「Messaging API」タブ**: ✅ 表示される

---

## 「Messaging API」タブでできること

「Messaging API」タブが表示されると、以下の設定が可能です：

1. **チャネルアクセストークンの発行**

   - `LINE_CHANNEL_ACCESS_TOKEN` の値を取得

2. **Webhook URL の設定**

   - Webhook エンドポイントの URL を設定
   - 例: `https://your-domain.amplifyapp.com/api/webhook/line`

3. **Webhook の利用**

   - Webhook を有効化/無効化

4. **応答設定**
   - 自動応答メッセージの設定

---

## 確認方法

### Messaging API チャネルが作成されているか確認

1. LINE Developers Console にアクセス
2. 左側のプロバイダー一覧を確認
3. チャネル一覧に以下が表示されているか確認：
   - **LINE ミニアプリチャネル**: 「Gacha Lab テストアプリ」
   - **Messaging API チャネル**: 「Gacha Lab」（または LINE 公式アカウントの名前）

### 「Messaging API」タブが表示されているか確認

1. Messaging API チャネルをクリック
2. チャネル設定画面の上部タブを確認
3. 「Messaging API」タブが表示されているか確認

---

## トラブルシューティング

### Q: LINE 公式アカウントを作成したが、Messaging API チャネルが表示されない

**A**: 以下の手順を確認してください：

1. LINE Official Account Manager で「Messaging API を利用する」が有効になっているか確認
2. 数分待ってから、LINE Developers Console を再読み込み
3. プロバイダーを切り替えて確認（左側のプロバイダー一覧）

### Q: 「Messaging API」タブが表示されない

**A**: 以下の点を確認してください：

1. 正しいチャネル（Messaging API チャネル）を選択しているか確認
2. LINE ミニアプリチャネルではなく、Messaging API チャネルを選択しているか確認
3. チャネルタイプが「Messaging API」と表示されているか確認

### Q: 既存の LINE 公式アカウントがある場合

**A**: 既存の LINE 公式アカウントでも Messaging API を有効化できます：

1. LINE Official Account Manager で既存の公式アカウントを選択
2. 「設定」→「Messaging API」に移動
3. 「Messaging API を利用する」を有効化
4. LINE Developers Console で Messaging API チャネルを確認

---

## まとめ

- **LINE ミニアプリチャネル**には「Messaging API」タブは表示されません
- **Messaging API チャネル**を作成するには、LINE 公式アカウントから Messaging API を有効化する必要があります
- 2024 年 9 月 4 日以降、LINE Developers Console から直接 Messaging API チャネルを作成することはできません

---

## 関連ドキュメント

- [LINE 公式アカウント設定](./LINE公式アカウント設定.md)
- [環境変数設定値の取得方法](../dev/環境変数設定値の取得方法.md)
- [LINE 公式アカウント管理画面 URL 取得機能](./管理画面URL取得機能.md)
