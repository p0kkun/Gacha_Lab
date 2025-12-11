# AWS Amplify デプロイ手順

## 概要

AWS Amplifyを使用してNext.jsアプリケーションをデプロイする手順です。

---

## 📋 前提条件

- [ ] AWS RDS PostgreSQLが構築済み（✅ 完了）
- [ ] GitHubリポジトリが作成済み
- [ ] コードがGitHubにプッシュ済み

---

## 🚀 デプロイ手順

### ステップ1: Amplify Consoleにアクセス

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/)にアクセス
2. AWSアカウントでログイン
3. 「New app」→「Host web app」をクリック

---

### ステップ2: GitHubリポジトリの接続

1. **リポジトリプロバイダーを選択**
   - 「GitHub」を選択
   - 「Authorize」をクリックしてGitHubアカウントで認証

2. **リポジトリを選択**
   - リポジトリ: `Gacha_Lab`（または実際のリポジトリ名）
   - ブランチ: `main`（または`master`）

3. **「Next」をクリック**

---

### ステップ3: ビルド設定

1. **App name**: `gacha-lab`（任意）

2. **Build settings**: 自動検出されるが、カスタム設定を推奨

**ビルド設定（amplify.yml）**:

プロジェクトルート（`Gacha_Lab/`）に`amplify.yml`を作成：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd app
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: app/.next
    files:
      - '**/*'
  cache:
    paths:
      - app/node_modules/**/*
```

**注意**: 
- `baseDirectory`は`app/.next`（Next.jsのビルド出力先）
- `cache`で`node_modules`をキャッシュしてビルド時間を短縮

3. **「Next」をクリック**

---

### ステップ4: 環境変数の設定

1. **「Environment variables」セクションで以下を追加**:

| キー | 値 |
|------|-----|
| `NEXT_PUBLIC_LIFF_ID` | `2008642684-d8jPmggE` |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `admin` |
| `DATABASE_URL` | `postgresql://postgres:GachaLab2024!Secure@gacha-lab-db.cds4guwa0y2c.ap-northeast-1.rds.amazonaws.com:5432/gacha_lab?sslmode=require` |

**⚠️ 重要**: 
- `DATABASE_URL`はAWS RDSの接続文字列
- パスワードは`terraform.tfvars`で設定した`GachaLab2024!Secure`
- `sslmode=require`は必須

2. **「Save and deploy」をクリック**

---

### ステップ5: デプロイの確認

1. **ビルドログを確認**
   - ビルドが開始される
   - ログでエラーがないか確認

2. **デプロイ完了を待つ**
   - 通常5-10分程度
   - 「Deployed」と表示されれば完了

3. **URLの確認**
   - デプロイ完了後、URLが表示される
   - 例: `https://main.xxxxxxxxxxxx.amplifyapp.com`

---

## 🔧 ビルド設定ファイル（amplify.yml）の作成

プロジェクトルート（`Gacha_Lab/`）に`amplify.yml`を作成：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd app
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: app/.next
    files:
      - '**/*'
  cache:
    paths:
      - app/node_modules/**/*
```

このファイルをGitHubにコミット・プッシュしてください。

---

## 📝 デプロイ後の動作

### 自動デプロイ

- `main`ブランチにプッシュ → 本番環境に自動デプロイ
- 他のブランチにプッシュ → プレビュー環境に自動デプロイ

### 環境変数の更新

1. Amplify Console → アプリ → Environment variables
2. 環境変数を追加・編集
3. 「Redeploy this version」をクリックして再デプロイ

---

## 🔍 トラブルシューティング

### エラー: "Build failed"

**原因**: 
- ビルドコマンドが間違っている
- 依存関係のインストールに失敗

**解決方法**:
- `amplify.yml`のビルド設定を確認
- ビルドログでエラー内容を確認

---

### エラー: "Cannot find module"

**原因**: 
- `baseDirectory`が間違っている
- ファイルパスが正しくない

**解決方法**:
- `amplify.yml`の`baseDirectory`を確認
- Next.jsのビルド出力先（`.next`）が正しいか確認

---

### エラー: "Database connection failed"

**原因**: 
- `DATABASE_URL`が間違っている
- セキュリティグループの設定が間違っている

**解決方法**:
- 環境変数の`DATABASE_URL`を確認
- RDSのセキュリティグループでAmplifyからの接続を許可

---

## ✅ 確認項目

- [ ] GitHubリポジトリが作成されている
- [ ] コードがGitHubにプッシュされている
- [ ] `amplify.yml`が作成されている
- [ ] Amplify Consoleでアプリが作成されている
- [ ] 環境変数が設定されている
- [ ] ビルドが成功している
- [ ] デプロイが完了している
- [ ] アプリケーションが正常に動作している

---

## 📚 参考

- [AWS Amplify ドキュメント](https://docs.aws.amazon.com/amplify/)
- [AWS Amplify ビルド設定](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html)
- [Next.js on AWS Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [AWS RDS セキュリティグループ設定](./11_AWSデータベース設定.md)

---

## 次のステップ

デプロイが完了したら：

1. アプリケーションの動作確認
2. LINE LIFFアプリのエンドポイントURLを更新
3. 本番環境でのテスト


