# GitHub設定手順

## 1. GitHubリポジトリ作成

### リポジトリ情報

- **リポジトリ名**: `Gacha_Lab`
- **ユーザー名**: `YOUR_GITHUB_USERNAME`（実際のユーザー名に置き換え）
- **URL**: `https://github.com/YOUR_GITHUB_USERNAME/Gacha_Lab`（実際のURLに置き換え）

### リポジトリ作成方法

1. **GitHubにログイン**
   - https://github.com にアクセス
   - アカウントでログイン

2. **新しいリポジトリを作成**
   - 「New repository」をクリック
   - リポジトリ名: `Gacha_Lab`
   - 説明: 任意
   - Public/Private: 任意（Private推奨）
   - 「Create repository」をクリック

## 2. Personal Access Tokenの取得

### トークン作成

1. **GitHub Settingsにアクセス**
   - https://github.com/settings/tokens にアクセス
   - または、Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **新しいトークンを生成**
   - 「Generate new token」→「Generate new token (classic)」をクリック
   - **Note**: `Gacha_Lab Development`（任意の名前）
   - **Expiration**: 90 days または No expiration（推奨）
   - **Scopes**: 以下の権限を選択
     - `repo` (リポジトリへのフルアクセス)
     - `workflow` (GitHub Actionsへのアクセス、必要な場合)

3. **トークンをコピー**
   - 生成されたトークンをコピー（例: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
   - **重要**: このトークンは一度しか表示されません

### トークンの保存

- `github_認証情報.md`ファイルに保存（`.gitignore`に追加済み）
- 安全な場所にバックアップ

## 3. Gitリモート設定

### リモートURLの設定

```powershell
cd "YOUR_PROJECT_PATH\Gacha_Lab\app"
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_GITHUB_USERNAME/Gacha_Lab.git
```

**注意**: 以下の値を実際の値に置き換えてください：
- `YOUR_PROJECT_PATH`: プロジェクトのパス
- `YOUR_TOKEN`: Personal Access Token
- `YOUR_GITHUB_USERNAME`: GitHubユーザー名

### リモートURLの確認

```powershell
git remote -v
```

以下のように表示されればOK：

```
origin  https://YOUR_TOKEN@github.com/YOUR_GITHUB_USERNAME/Gacha_Lab.git (fetch)
origin  https://YOUR_TOKEN@github.com/YOUR_GITHUB_USERNAME/Gacha_Lab.git (push)
```

## 4. GitLens認証（VS Code）

### 方法1: コマンドパレットから認証

1. **VS Codeを開く**
2. **コマンドパレットを開く** (`Ctrl + Shift + P`)
3. **「GitLens: Connect to GitHub」を検索して実行**
4. **ブラウザが開くので、GitHubで認証を許可**
5. **認証が完了すると、VS Codeに戻る**

### 方法2: GitLens設定から認証

1. **VS Codeの設定を開く** (`Ctrl + ,`)
2. **「GitLens」で検索**
3. **「GitLens: Connect to GitHub」をクリック**
4. **ブラウザで認証を完了**

### トラブルシューティング

- **認証画面が表示されない場合**:
  - VS Codeを再起動
  - GitLens拡張機能を再インストール
  - コマンドパレットで「Developer: Reload Window」を実行

## 5. 初回コミット・プッシュ

### ファイルの追加

```powershell
cd "YOUR_PROJECT_PATH\Gacha_Lab\app"
git add .
```

### コミット

```powershell
git commit -m "Initial commit: Gacha Lab app"
```

### プッシュ

```powershell
git push origin main
```

## 6. .gitignoreの確認

以下のファイルが`.gitignore`に含まれていることを確認：

```
.env.local
.env*.local
node_modules/
.github_認証情報.md
ngrok_認証情報.md
```

## 7. GitHub Pages設定（規約・プライバシーポリシー用）

### 設定方法

1. **GitHubリポジトリの設定を開く**
   - Settings → Pages

2. **Sourceを設定**
   - Source: `main`ブランチ
   - Folder: `/ (root)`

3. **保存**
   - 「Save」をクリック

4. **URLの確認**
   - 数分後に `https://YOUR_GITHUB_USERNAME.github.io/Gacha_Lab/` でアクセス可能

### ファイル配置

- `terms.html`: サービス利用規約
- `privacy.html`: プライバシーポリシー

これらのファイルはリポジトリのルートに配置します。

## 確認項目

- [ ] GitHubリポジトリを作成した
- [ ] Personal Access Tokenを取得した
- [ ] リモートURLを設定した
- [ ] GitLensで認証した（VS Codeを使用する場合）
- [ ] 初回コミット・プッシュが完了した
- [ ] `.gitignore`が正しく設定されている
- [ ] GitHub Pagesが設定されている（規約・プライバシーポリシー用）

## セキュリティ注意事項

⚠️ **重要**:

- Personal Access Tokenは機密情報です
- 他人に共有しないでください
- トークンが漏洩した場合は、すぐにGitHubで削除してください
- `.gitignore`に認証情報ファイルを追加してください

## 次のステップ

- AWS Amplifyでのデプロイ準備（将来）
- または、追加機能の実装に進む

