# GitHub Actions Workflows

## AI Review Workflow

PR作成時に自動でAIレビューを実行します。

### セットアップ

1. **GitHub Secretsの設定**
   - リポジトリの Settings → Secrets and variables → Actions に移動
   - 以下のシークレットを追加：
     - `HF_TOKEN`: Hugging Face APIトークン（必須）
     - `HF_MODEL` (オプション): 使用するモデル名（デフォルト: `elyza/ELYZA-japanese-Llama-2-7b-instruct`）

2. **動作確認**
   - PRを作成すると自動でレビューコメントが追加されます
   - 既存のAIレビューコメントは自動で削除され、新しいレビューで上書きされます

### カスタマイズ

- **レビュー指示の変更**: `prompts/review.md` を編集
- **使用モデルの変更**: GitHub Secretsの`HF_MODEL`を変更
  - 推奨モデル: `elyza/ELYZA-japanese-Llama-2-7b-instruct`（日本語特化）
  - その他: `matsuo-lab/weblab-10b-instruction-sft`, `stabilityai/japanese-stablelm-instruct-alpha-7b`
- **他のLLM APIを使用**: `.github/workflows/ai_review.yml`の`Call Hugging Face API for Review`ステップを編集

### トラブルシューティング

- **レビューが生成されない**: `HF_TOKEN`が正しく設定されているか確認
- **モデルがロード中エラー**: 初回使用時はモデルのロードに時間がかかります。自動でリトライされますが、時間がかかる場合があります
- **エラーメッセージ**: GitHub Actionsのログを確認
- **差分が大きすぎる**: デフォルトで50KBに制限されています。必要に応じて`ai_review.yml`の`head -c 50000`の値を調整
