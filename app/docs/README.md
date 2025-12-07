# Gacha Lab 開発ドキュメント

## ドキュメント一覧

### 1. [開発手順_全体概要](./01_開発手順_全体概要.md)
プロジェクトの全体概要と開発フローの説明

### 2. [LINE_Developers_セットアップ](./02_LINE_Developers_セットアップ.md)
LINE Developersコンソールでのプロバイダー・チャネル作成手順

### 3. [プロジェクトセットアップ](./03_プロジェクトセットアップ.md)
Next.jsプロジェクトの作成と環境設定

### 4. [機能実装](./04_機能実装.md)
実装済み機能の説明と実装のポイント

### 5. [ローカル開発環境](./05_ローカル開発環境.md)
ngrok/localtunnelを使用したローカル開発環境のセットアップ

### 6. [動作確認](./06_動作確認.md)
動作確認手順とトラブルシューティング

### 7. [GitHub設定](./07_GitHub設定.md)
GitHubリポジトリの作成と認証設定

## クイックスタート

### 初めてセットアップする場合

1. [02_LINE_Developers_セットアップ.md](./02_LINE_Developers_セットアップ.md) から開始
2. [03_プロジェクトセットアップ.md](./03_プロジェクトセットアップ.md) でプロジェクトを作成
3. [05_ローカル開発環境.md](./05_ローカル開発環境.md) で開発環境を構築
4. [06_動作確認.md](./06_動作確認.md) で動作確認

### 既存プロジェクトを再開する場合

1. プロジェクトディレクトリに移動
2. 依存関係をインストール: `npm install`
3. `.env.local`を確認
4. 開発サーバーを起動: `npm run dev`
5. ngrokを起動: `ngrok http 3000`

## よくある質問

### Q: LIFF IDはどこで確認できますか？

A: LINE Developersコンソール → チャネル設定 → LIFFタブで確認できます。

### Q: エンドポイントURLはどこで設定しますか？

A: LINE Developersコンソール → チャネル設定 → LIFFタブ → 開発用LIFFアプリの「編集」から設定できます。

### Q: 動画が再生されない場合は？

A: [06_動作確認.md](./06_動作確認.md) の「トラブルシューティング」セクションを参照してください。

### Q: GitHubへのプッシュができない場合は？

A: [07_GitHub設定.md](./07_GitHub設定.md) の「GitLens認証」セクションを参照してください。

## 参考リンク

- [LINE Developers コンソール](https://developers.line.biz/console/)
- [LIFF SDK ドキュメント](https://developers.line.biz/ja/docs/liff/)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [ngrok ドキュメント](https://ngrok.com/docs)
- [GitHub ドキュメント](https://docs.github.com/ja)

## 更新履歴

- 2025-12-07: 初版作成

