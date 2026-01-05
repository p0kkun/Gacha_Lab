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

aws --endpoint-url=http://localhost:4566 s3 mb s3://$BUCKET_NAME 2>/dev/null || echo "バケットは既に存在します"

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



