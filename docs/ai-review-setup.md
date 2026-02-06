# AIレビュー自動化セットアップガイド

## 概要

このドキュメントでは、GitHub Actionsを使用してPR作成時に自動でAIレビューを実行する方法を説明します。

## 必要なもの

- GitHubリポジトリへの書き込み権限
- OpenAI APIキー（または他のLLM APIキー）

## セットアップ手順

### 1. GitHub Secretsの設定

1. GitHubリポジトリにアクセス
2. **Settings** → **Secrets and variables** → **Actions** に移動
3. **New repository secret** をクリック
4. 以下のシークレットを追加：

   | シークレット名 | 説明 | 必須 |
   |--------------|------|------|
   | `HF_TOKEN` | Hugging Face APIトークン | ✅ |
   | `HF_MODEL` | 使用するモデル名（例: `elyza/ELYZA-japanese-Llama-2-7b-instruct`） | ❌（デフォルト: `elyza/ELYZA-japanese-Llama-2-7b-instruct`） |

### 2. ファイルの確認

以下のファイルがリポジトリに存在することを確認してください：

- `.github/workflows/ai_review.yml` - GitHub Actionsワークフロー
- `prompts/review.md` - AIレビュー指示ファイル

### 3. 動作確認

1. 新しいブランチを作成
2. 何か変更を加えてコミット
3. PRを作成
4. GitHub Actionsが自動で実行され、PRにレビューコメントが追加されます

## カスタマイズ

### レビュー指示の変更

`prompts/review.md` を編集することで、AIレビューの指針を変更できます。

例：
- チェック項目の追加・削除
- 出力形式の変更
- プロジェクト固有のルールの追加

### 使用モデルの変更

GitHub Secretsの `HF_MODEL` を変更することで、使用するモデルを変更できます。

推奨モデル（日本語対応）：
- `elyza/ELYZA-japanese-Llama-2-7b-instruct` - 日本語特化、バランス型（デフォルト）
- `matsuo-lab/weblab-10b-instruction-sft` - より高精度なレビューが必要な場合
- `stabilityai/japanese-stablelm-instruct-alpha-7b` - 軽量で高速

**注意**: モデル名は `{org}/{model-name}` の形式で指定してください。

### 他のLLM APIを使用

`.github/workflows/ai_review.yml` の `Call Hugging Face API for Review` ステップを編集することで、他のLLM API（OpenAI、Azure OpenAI、Anthropic Claude、Google Geminiなど）を使用できます。

## トラブルシューティング

### レビューが生成されない

**原因**: `HF_TOKEN`が設定されていない、または無効

**解決方法**:
1. GitHub Secretsで `HF_TOKEN` が正しく設定されているか確認
2. APIトークンが有効か確認（Hugging FaceのSettings → Access Tokensで確認）
3. モデルがロード中の場合、初回使用時は時間がかかります（自動でリトライされます）

### エラーメッセージが表示される

**原因**: APIリクエストのエラー、またはワークフローの設定ミス

**解決方法**:
1. GitHub Actionsのログを確認（`.github/workflows/ai_review.yml`の実行ログ）
2. エラーメッセージの内容を確認
3. APIキーの有効期限を確認

### 差分が大きすぎてレビューが生成されない

**原因**: PRの差分が大きすぎる（デフォルトで50KBに制限）

**解決方法**:
1. `.github/workflows/ai_review.yml` の以下の行を編集：
   ```yaml
   head -c 50000 pr.diff > pr.diff.truncated || cp pr.diff pr.diff.truncated
   ```
2. `50000` をより大きな値（例: `100000`）に変更

### レビューコメントが重複する

**原因**: 既存コメントの削除処理が失敗している

**解決方法**:
- 通常は自動で削除されますが、手動で削除することも可能です

## コスト目安

Hugging Face Inference APIの使用料金は、以下の要因によって変動します：

- **使用モデル**: モデルによって異なる
- **PRの差分サイズ**: 差分が大きいほど、トークン数が増加
- **レビュー頻度**: PRの数に応じて変動

**無料枠**:
- Hugging Face Inference APIは無料枠があります（制限あり）
- 詳細は [Hugging Face Pricing](https://huggingface.co/pricing) を確認してください

**注意**: 初回使用時やモデルが非アクティブな場合、モデルのロードに時間がかかることがあります。

## ベストプラクティス

1. **レビュー指示の最適化**: プロジェクトの特性に合わせて `prompts/review.md` を調整
2. **モデルの選択**: コストと品質のバランスを考慮してモデルを選択
3. **差分サイズの制限**: 大きなPRは分割するか、差分サイズの制限を調整
4. **レビューの確認**: AIレビューは補助的なものとして使用し、人間による最終確認を推奨

## 関連ファイル

- `.github/workflows/ai_review.yml` - GitHub Actionsワークフロー
- `prompts/review.md` - AIレビュー指示ファイル
- `.github/workflows/README.md` - ワークフローの概要
