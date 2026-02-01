#!/bin/bash

# LocalStackのセットアップスクリプト

echo "🚀 LocalStackのセットアップを開始します..."

# Docker ComposeでLocalStackを起動
echo "📦 LocalStackコンテナを起動中..."
docker-compose -f docker-compose.localstack.yml up -d

# LocalStackの起動を待つ
echo "⏳ LocalStackの起動を待機中..."
sleep 10

# バケットを作成
BUCKET_NAME=${AWS_S3_BUCKET_NAME:-gacha-lab-test}
echo "🪣 S3バケットを作成中: $BUCKET_NAME"

LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://127.0.0.1:4566}"
aws --endpoint-url=$LOCALSTACK_ENDPOINT s3 mb s3://$BUCKET_NAME 2>/dev/null || echo "バケットは既に存在します"

# CORS設定（Presigned PUTのプリフライト対策）
echo "🌐 S3バケットのCORS設定を適用中..."
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-test}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-test}
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}
CORS_FILE="$(cd "$(dirname "$0")" && pwd)/localstack-s3-cors.json"
aws --endpoint-url=$LOCALSTACK_ENDPOINT s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration "file://$CORS_FILE" 2>/dev/null \
  && echo "✅ CORS設定を適用しました" \
  || echo "⚠️  CORS設定の適用に失敗しました（必要に応じて手動で設定してください）"

echo "✅ LocalStackのセットアップが完了しました！"
echo ""
echo "📝 次のステップ:"
echo "1. .env.localに以下を追加:"
echo "   USE_LOCALSTACK=true"
echo "   AWS_S3_BUCKET_NAME=$BUCKET_NAME"
echo ""
echo "2. 開発サーバーを起動:"
echo "   npm run dev"
echo ""
echo "3. LocalStackを停止する場合:"
echo "   docker-compose -f docker-compose.localstack.yml down"




