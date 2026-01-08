# LIFF URL設定ガイド

## LIFF URLについて

### 開発用
- **LIFF URL**: `https://miniapp.line.me/2008642684-d8jPmggE`
- **LIFF ID**: `2008642684-d8jPmggE`
- **エンドポイントURL**: `https://interoceptive-kobe-unshimmeringly.ngrok-free.dev`
- **アプリ名**: Gacha Lab テストアプリ

### 審査用
- **LIFF URL**: `https://miniapp.line.me/2008642685-xyZrjKKN`
- **LIFF ID**: `2008642685-xyZrjKKN`
- **エンドポイントURL**: `https://dev.d2zlbom9902v0u.amplifyapp.com`
- **アプリ名**: Gacha Lab テストアプリ

### 本番用
- **LIFF URL**: `https://miniapp.line.me/2008642686-qmd6bXXk`
- **LIFF ID**: `2008642686-qmd6bXXk`
- **エンドポイントURL**: `https://developers.line.biz/assets/liff-default-published.html`（仮・要設定）
- **アプリ名**: Gacha Lab テストアプリ

### 注意事項
- **旧ドメイン名（liff.line.me）の利用**: 旧ドメイン名（`liff.line.me`）のLIFF URLも引き続き利用可能です
- **Custom Path**: 本番用のLIFF URLに独自の文字列を設定できます（例: `https://miniapp.line.me/cony_coffee`）

---

## リッチメニューでの使用

### 開発環境

リッチメニューの各ボタンに設定するURI：

- **ガチャ**: `https://miniapp.line.me/2008642684-d8jPmggE?action=gacha`
- **マイページ**: `https://miniapp.line.me/2008642684-d8jPmggE?action=mypage`
- **抽選履歴**: `https://miniapp.line.me/2008642684-d8jPmggE?action=history`
- **友達を招待**: `https://miniapp.line.me/2008642684-d8jPmggE?action=referral`

### 本番環境

リッチメニューの各ボタンに設定するURI：

- **ガチャ**: `https://liff.line.me/2008642684-d8jPmggE?action=gacha`
- **マイページ**: `https://liff.line.me/2008642684-d8jPmggE?action=mypage`
- **抽選履歴**: `https://liff.line.me/2008642684-d8jPmggE?action=history`
- **友達を招待**: `https://liff.line.me/2008642684-d8jPmggE?action=referral`

---

## 環境変数の設定

### `.env.local`（ローカル開発用）

```env
# LIFF設定（開発用）
NEXT_PUBLIC_LIFF_ID=2008642684-d8jPmggE
NEXT_PUBLIC_LIFF_URL=https://miniapp.line.me/2008642684-d8jPmggE
```

### `.env.development`（審査用・開発環境）

```env
# LIFF設定（審査用）
NEXT_PUBLIC_LIFF_ID=2008642685-xyZrjKKN
NEXT_PUBLIC_LIFF_URL=https://miniapp.line.me/2008642685-xyZrjKKN
```

### `.env.production`（本番用）

```env
# LIFF設定（本番用）
NEXT_PUBLIC_LIFF_ID=2008642686-qmd6bXXk
NEXT_PUBLIC_LIFF_URL=https://miniapp.line.me/2008642686-qmd6bXXk
```

---

## リッチメニューでの使用

### 開発環境
- **ガチャ**: `https://miniapp.line.me/2008642684-d8jPmggE?action=gacha`
- **マイページ**: `https://miniapp.line.me/2008642684-d8jPmggE?action=mypage`
- **抽選履歴**: `https://miniapp.line.me/2008642684-d8jPmggE?action=history`
- **友達を招待**: `https://miniapp.line.me/2008642684-d8jPmggE?action=referral`

### 審査環境
- **ガチャ**: `https://miniapp.line.me/2008642685-xyZrjKKN?action=gacha`
- **マイページ**: `https://miniapp.line.me/2008642685-xyZrjKKN?action=mypage`
- **抽選履歴**: `https://miniapp.line.me/2008642685-xyZrjKKN?action=history`
- **友達を招待**: `https://miniapp.line.me/2008642685-xyZrjKKN?action=referral`

### 本番環境
- **ガチャ**: `https://miniapp.line.me/2008642686-qmd6bXXk?action=gacha`
- **マイページ**: `https://miniapp.line.me/2008642686-qmd6bXXk?action=mypage`
- **抽選履歴**: `https://miniapp.line.me/2008642686-qmd6bXXk?action=history`
- **友達を招待**: `https://miniapp.line.me/2008642686-qmd6bXXk?action=referral`

## 注意事項

1. **環境ごとのLIFF ID**
   - 開発用、審査用、本番用で異なるLIFF IDを使用
   - 環境変数で適切に設定する必要があります

2. **エンドポイントURL**
   - 各環境で異なるエンドポイントURLをLINE Developers Consoleで設定
   - 開発用: ngrok URL（ローカル開発時）
   - 審査用: AWS Amplifyの開発環境URL
   - 本番用: 本番環境のURL（要設定）

3. **URLパラメータ**
   - `?action=gacha` などのパラメータを追加可能
   - LIFFアプリ側で `useSearchParams()` で取得
   - 紹介リンク: `?ref=xxx` パラメータも使用可能

---

## 確認方法

1. **LINE Developers Console**
   - LIFFアプリの設定を確認
   - LIFF IDを確認

2. **動作確認**
   - 開発環境: `https://miniapp.line.me/2008642684-d8jPmggE` にアクセス
   - 本番環境: `https://liff.line.me/2008642684-d8jPmggE` にアクセス









