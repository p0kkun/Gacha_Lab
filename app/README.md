# Gacha Lab - LINE ミニアプリ

LINE 上で動作するガチャアプリケーションです。

## 機能

- LINE LIFF SDK を使用したユーザー情報取得
- 全画面オーバーレイでガチャ選択
- 左側メニューでガチャ種類選択
- 右側に「ガチャを引く」ボタン
- 動画演出による当たり判定表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、LIFF ID を設定してください：

```env
NEXT_PUBLIC_LIFF_ID=your_liff_id_here
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. localtunnel で外部公開（スマホテスト用）

別のターミナルで以下を実行：

```bash
npx localtunnel --port 3000
```

表示された URL（例: `https://xxxxx.loca.lt`）を LINE Developers コンソールの LIFF URL に設定してください。

## プロジェクト構成

```
app/
├── app/
│   ├── api/
│   │   └── gacha/
│   │       └── route.ts      # ガチャ抽選API
│   ├── layout.tsx            # ルートレイアウト
│   └── page.tsx              # メインページ
├── components/
│   ├── GachaModal.tsx        # 全画面ガチャモーダル
│   ├── GachaMenu.tsx         # 左側メニュー
│   ├── GachaContent.tsx      # 右側メインコンテンツ
│   └── VideoPlayer.tsx       # 動画再生コンポーネント
├── lib/
│   └── liff.ts               # LIFF SDK ラッパー
└── public/
    └── videos/               # 動画ファイル配置ディレクトリ
```

## 次のステップ

- [ ] データベース連携（抽選履歴の保存）
- [ ] 管理画面の実装（動画アップロード）
- [ ] 認証機能の強化
- [ ] エラーハンドリングの改善
