# Gacha Lab - LINE ミニアプリ

LINE 上で動作するガチャアプリケーションです。

## 📚 ドキュメント

詳細な開発手順は [`docs/`](./docs/) ディレクトリを参照してください。

- [開発手順 全体概要](./docs/01_開発手順_全体概要.md)
- [LINE Developers セットアップ](./docs/02_LINE_Developers_セットアップ.md)
- [プロジェクトセットアップ](./docs/03_プロジェクトセットアップ.md)
- [機能実装](./docs/04_機能実装.md)
- [ローカル開発環境](./docs/05_ローカル開発環境.md)
- [動作確認](./docs/06_動作確認.md)
- [GitHub 設定](./docs/07_GitHub設定.md)
- [AWS S3 動画アップロード設定手順](./docs/66_AWS_S3動画アップロード設定手順.md) ⭐ 新規
- [AWS CloudFront 構築手順](./docs/70_AWS_CloudFront構築手順.md) ⭐ 新規
- [ローカル S3 検証環境のセットアップ（LocalStack）](./docs/69_ローカルS3検証環境のセットアップ.md) ⭐ 新規

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

`.env.local` ファイルを作成し、必要な環境変数を設定してください：

```env
# LINE LIFF
NEXT_PUBLIC_LIFF_ID=your_liff_id_here

# AWS S3（動画アップロード機能を使用する場合）
# 開発環境と本番環境で異なるバケット名を使用することを推奨
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=gacha-lab-test  # 開発環境: gacha-lab-test, 本番環境: gacha-lab-prod
AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain  # オプション（CloudFrontを使用する場合）
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. localtunnel で外部公開（スマホテスト用）

別のターミナルで以下を実行：

```bash
ngrok http 3000
```

表示された URL（例: `https://xxxxx.ngrok-free.dev`）を LINE Developers コンソールの LIFF URL に設定してください。

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
