# LINE公式アカウント設定手順

## 概要

LINE公式アカウントを作成し、Messaging APIを有効化して、リッチメニューを設定する手順です。

---

## 1. LINE公式アカウントの作成

### 1.1 LINE Official Account Managerにアクセス

1. [LINE Official Account Manager](https://account.line.biz/) にアクセス
2. LINEアカウントでログイン

### 1.2 公式アカウントの作成

1. 「新規作成」をクリック
2. **アカウント名**: `ポーカーガチャ`（推奨）
   - ⚠️ **注意**: 未認証アカウントは変更可能（変更後7日間は再度変更不可）
   - 認証済みアカウントは原則として変更不可
3. **説明**: 任意（省略可）
4. 「作成」をクリック

### 1.3 複数アカウントについて

- **1つのLINEビジネスIDにつき、最大100個まで作成可能**（無料）
- 店舗やサービスごとにアカウントを分けて運用可能
- 各アカウントごとに月200通まで無料でメッセージ配信可能

---

## 2. Messaging APIの有効化

### 2.1 重要：2024年9月4日以降の変更

**2024年9月4日以降、LINE Developersコンソールから直接Messaging APIチャネルを作成することはできなくなりました。**

新しい手順：
1. **LINE公式アカウントを作成**（上記手順）
2. **LINE Official Account ManagerからMessaging APIを有効化**

### 2.2 Messaging APIの有効化手順

1. LINE Official Account Managerにログイン
2. 作成した公式アカウントを選択
3. 「設定」→「Messaging API」に移動
4. 「Messaging APIを利用する」を有効化
5. これにより、LINE Developers ConsoleにMessaging APIチャネルが自動的に作成されます

---

## 3. LINE Developers Consoleでの設定

### 3.1 Messaging APIチャネルの確認

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 作成されたMessaging APIチャネルを確認
3. チャネルが自動的に作成されていることを確認

### 3.2 Channel Access Tokenの取得

1. チャネル設定画面で「Messaging API」タブを開く
2. 「チャネルアクセストークン」→「発行」をクリック
3. トークンをコピー（後で`.env.local`に設定）

### 3.3 Channel Secretの確認

1. 「基本設定」タブを開く
2. 「チャネルシークレット」を確認
3. シークレットをコピー（後で`.env.local`に設定）

### 3.4 Webhook URLの設定（必要に応じて）

1. 「Messaging API」タブを開く
2. 「Webhook URL」→「編集」をクリック
3. Webhook URLを設定（例: `https://your-domain.com/api/webhook`）

---

## 4. 基本情報の設定

### 4.1 紹介文の設定

1. LINE Official Account Managerで公式アカウントを選択
2. 「基本情報」→「紹介文」を設定
3. **推奨**: 「ポーカーイベントのクーポンが当たるガチャアプリ」（24文字）

### 4.2 WebサイトURLの設定

1. 「基本情報」→「Webサイト」を設定
2. **Webサイト名**: 「ポーカーガチャプラットフォーム」
3. **URL**: LIFFアプリのURL
   - 開発用: `https://miniapp.line.me/2008642684-d8jPmggE`
   - 本番用: `https://liff.line.me/2008642684-d8jPmggE`

### 4.3 支払い方法の設定

1. 「基本情報」→「支払い方法」を設定
2. **カード利用可**を選択
3. 利用可能なカード: VISA、Master、JCB

### 4.4 その他の設定

- **営業時間**: 設定しない（24時間利用可能なため）
- **予算**: 設定しない（商品ごとに価格が異なるため）
- **電話**: 設定しない（初期段階では不要）
- **設備**: 設定しない（オンラインサービスなので不要）
- **住所**: 設定しない（オンラインサービスなので不要）

詳細は `LINE公式アカウント基本情報設定.md` を参照してください。

---

## 5. 環境変数の設定

### 5.1 `.env.local`ファイルに追加

```env
# Messaging API設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# LIFF設定（既存）
NEXT_PUBLIC_LIFF_ID=2008642684-d8jPmggE
NEXT_PUBLIC_LIFF_URL=https://miniapp.line.me/2008642684-d8jPmggE
```

### 5.2 本番環境の場合

本番環境では、LIFF URLを本番用に変更：

```env
NEXT_PUBLIC_LIFF_URL=https://liff.line.me/2008642684-d8jPmggE
```

---

## 確認項目

- [ ] LINE公式アカウントを作成した
- [ ] Messaging APIを有効化した
- [ ] Channel Access Tokenを取得した
- [ ] Channel Secretを確認した
- [ ] 基本情報（紹介文、WebサイトURL）を設定した
- [ ] 環境変数を設定した

---

## 次のステップ

- [09_リッチメニュー実装.md](./09_リッチメニュー実装.md) に進む

---

## 参考資料

- [LINE Official Account Manager](https://account.line.biz/)
- [LINE Developers Console](https://developers.line.biz/console/)
- [Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [LINE公式アカウント基本情報設定.md](../LINE公式アカウント基本情報設定.md)

