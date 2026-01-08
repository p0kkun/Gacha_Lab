# LIFF 環境別設定

## 概要

開発用、審査用、本番用の 3 つの環境で異なる LIFF URL とエンドポイント URL を使用します。

---

## 📋 LIFF URL 一覧

### 開発用

- **LIFF URL**: `https://miniapp.line.me/2008642684-d8jPmggE`
- **LIFF ID**: `2008642684-d8jPmggE`
- **エンドポイント URL**: `https://interoceptive-kobe-unshimmeringly.ngrok-free.dev`
- **アプリ名**: Gacha Lab テストアプリ

### 審査用

- **LIFF URL**: `https://miniapp.line.me/2008642685-xyZrjKKN`
- **LIFF ID**: `2008642685-xyZrjKKN`
- **エンドポイント URL**: `https://dev.d2zlbom9902v0u.amplifyapp.com`
- **アプリ名**: Gacha Lab テストアプリ

### 本番用

- **LIFF URL**: `https://miniapp.line.me/2008642686-qmd6bXXk`
- **LIFF ID**: `2008642686-qmd6bXXk`
- **エンドポイント URL**: `https://developers.line.biz/assets/liff-default-published.html`（仮）
- **アプリ名**: Gacha Lab テストアプリ

---

## 🔧 環境変数の設定

### `.env.local`（ローカル開発用）

```env
# LIFF設定（開発用）
NEXT_PUBLIC_LIFF_ID=2008642684-d8jPmggE
NEXT_PUBLIC_LIFF_URL=https://miniapp.line.me/2008642684-d8jPmggE

# その他の設定...
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

## 📝 注意事項

1. **旧ドメイン名（liff.line.me）の利用**

   - 旧ドメイン名（`liff.line.me`）の LIFF URL も引き続き利用可能です
   - 例: `https://liff.line.me/2008642684-d8jPmggE`

2. **Custom Path の設定**

   - 本番用の LIFF URL に独自の文字列を設定できます
   - 例: `https://miniapp.line.me/cony_coffee`
   - 設定方法は LINE Developers Console の「Custom Path を設定する」を参照

3. **エンドポイント URL**

   - 各環境で異なるエンドポイント URL を設定する必要があります
   - 開発用: ngrok URL（ローカル開発時）
   - 審査用: AWS Amplify の開発環境 URL
   - 本番用: 本番環境の URL（設定が必要）

4. **サイズ設定**
   - すべての環境で `full` サイズを使用

---

## 🚀 デプロイ時の確認事項

### 開発環境（審査用）へのデプロイ時

- [ ] `.env.development` または環境変数で `NEXT_PUBLIC_LIFF_ID` と `NEXT_PUBLIC_LIFF_URL` を設定
- [ ] LINE Developers Console で審査用 LIFF アプリのエンドポイント URL を更新
- [ ] リッチメニューで審査用 LIFF URL を使用

### 本番環境へのデプロイ時

- [ ] `.env.production` または環境変数で `NEXT_PUBLIC_LIFF_ID` と `NEXT_PUBLIC_LIFF_URL` を設定
- [ ] LINE Developers Console で本番用 LIFF アプリのエンドポイント URL を更新
- [ ] リッチメニューで本番用 LIFF URL を使用
- [ ] Custom Path を設定する場合は、本番用 LIFF URL をカスタマイズ

---

## 📚 参考資料

- [LINE Developers Console](https://developers.line.biz/console/)
- [LIFF ドキュメント](https://developers.line.biz/ja/docs/liff/)



