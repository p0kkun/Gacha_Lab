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

### 8. [LINE公式アカウント設定](./08_LINE公式アカウント設定.md)
LINE公式アカウントの作成とMessaging APIの有効化

### 9. [リッチメニュー実装](./09_リッチメニュー実装.md)
リッチメニューの作成とLIFFアプリとの連携

### 10. [Stripe決済設定](./10_Stripe決済設定.md)
Stripeアカウントの作成とテストモードの設定

### 11. [AWSデータベース設定](./11_AWSデータベース設定.md)
AWS RDS PostgreSQLのセットアップと接続設定

### 12. [ローカルデータベース構築](./12_ローカルデータベース構築.md)
ローカル開発環境でのPostgreSQLデータベース構築手順

### 13. [AWS環境構築_前提条件確認](./13_AWS環境構築_前提条件確認.md)
AWS環境構築前に必要な前提条件の確認

### 14. [AWS_AmplifyとRDSの関係](./14_AWS_AmplifyとRDSの関係.md)
AWS AmplifyとRDS PostgreSQLの関係と構築方法

### 15. [AWS環境構築_手順書](./15_AWS環境構築_手順書.md)
AWS RDS PostgreSQL構築の詳細手順

### 16. [Terraform手動インストール手順](./16_Terraform手動インストール手順.md)
Terraformの手動インストール手順（Windows）

### 17. [環境変数の管理方法](./17_環境変数の管理方法.md)
開発環境と本番環境での環境変数の管理方法

### 18. [AWS無料枠での完結構成](./19_AWS無料枠での完結構成.md)
AWS無料枠だけで完結する構成の説明

### 19. [AWS_Amplifyデプロイ手順](./20_AWS_Amplifyデプロイ手順.md)
AWS Amplifyを使用したデプロイ手順

### 20. [AWS_AmplifyとECSの違い](./22_AWS_AmplifyとECSの違い.md)
AWS AmplifyとECS/EC2の違いと選択基準

## クイックスタート

### 初めてセットアップする場合

1. [02_LINE_Developers_セットアップ.md](./02_LINE_Developers_セットアップ.md) から開始
2. [03_プロジェクトセットアップ.md](./03_プロジェクトセットアップ.md) でプロジェクトを作成
3. [08_LINE公式アカウント設定.md](./08_LINE公式アカウント設定.md) で公式アカウントを作成
4. [09_リッチメニュー実装.md](./09_リッチメニュー実装.md) でリッチメニューを実装
5. [10_Stripe決済設定.md](./10_Stripe決済設定.md) でStripeを設定
6. [11_AWSデータベース設定.md](./11_AWSデータベース設定.md) でデータベースを設定
7. [05_ローカル開発環境.md](./05_ローカル開発環境.md) で開発環境を構築
8. [06_動作確認.md](./06_動作確認.md) で動作確認

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
- [Stripe ドキュメント](https://stripe.com/docs/jp)
- [AWS RDS ドキュメント](https://aws.amazon.com/jp/rds/postgresql/)

## 更新履歴

- 2025-12-07: 初版作成

