# LIFF URL設定ガイド

## LIFF URLについて

### 開発用URL

```
https://miniapp.line.me/2008642684-d8jPmggE
```

- **ドメイン**: `miniapp.line.me`（開発用）
- **LIFF ID**: `2008642684-d8jPmggE`

### 本番用URL

```
https://liff.line.me/2008642684-d8jPmggE
```

- **ドメイン**: `liff.line.me`（本番用）
- **LIFF ID**: `2008642684-d8jPmggE`（同じ）

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

### `.env.local`ファイル

```env
# LIFF ID（開発用・本番用で同じ）
NEXT_PUBLIC_LIFF_ID=2008642684-d8jPmggE

# LIFF URL（開発用）
NEXT_PUBLIC_LIFF_URL=https://miniapp.line.me/2008642684-d8jPmggE

# 本番環境では以下を使用
# NEXT_PUBLIC_LIFF_URL=https://liff.line.me/2008642684-d8jPmggE
```

---

## 注意事項

1. **開発用と本番用の違い**
   - 開発用: `miniapp.line.me`
   - 本番用: `liff.line.me`
   - LIFF IDは同じ

2. **リッチメニューの設定**
   - 開発環境では `miniapp.line.me` を使用
   - 本番環境では `liff.line.me` を使用
   - 環境に応じて切り替えが必要

3. **URLパラメータ**
   - `?action=gacha` などのパラメータを追加可能
   - LIFFアプリ側で `useSearchParams()` で取得

---

## 確認方法

1. **LINE Developers Console**
   - LIFFアプリの設定を確認
   - LIFF IDを確認

2. **動作確認**
   - 開発環境: `https://miniapp.line.me/2008642684-d8jPmggE` にアクセス
   - 本番環境: `https://liff.line.me/2008642684-d8jPmggE` にアクセス





