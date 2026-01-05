#!/bin/bash

# CloudFrontとS3のCORS設定を自動化するスクリプト
# 使用方法: ./setup-cloudfront-cors.sh

set -e

# 設定変数（環境変数から取得、またはデフォルト値を使用）
BUCKET_NAME="${S3_BUCKET_NAME:-gacha-lab-test}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E2O1UP219WO08E}"
REGION="${S3_REGION:-ap-northeast-1}"

echo "=========================================="
echo "CloudFront & S3 CORS設定スクリプト"
echo "=========================================="
echo "バケット名: $BUCKET_NAME"
echo "ディストリビューションID: $DISTRIBUTION_ID"
echo "リージョン: $REGION"
echo ""

# 1. S3バケットのCORS設定
echo "ステップ1: S3バケットのCORS設定を更新中..."
cat > /tmp/cors-config.json <<EOF
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "line://",
      "https://liff.line.me",
      "http://localhost:3000",
      "https://dev.d2zlbom9902v0u.amplifyapp.com",
      "https://*.amplifyapp.com"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "Content-Range",
      "Accept-Ranges",
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
EOF

aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration file:///tmp/cors-config.json \
  --region "$REGION"

echo "✅ S3バケットのCORS設定を更新しました"
echo ""

# 2. CloudFrontレスポンスヘッダーポリシーの作成
echo "ステップ2: CloudFrontレスポンスヘッダーポリシーを作成中..."
cat > /tmp/response-headers-policy.json <<EOF
{
  "ResponseHeadersPolicyConfig": {
    "Name": "LineAppVideoCORS",
    "Comment": "LINEアプリでの動画再生用CORS設定",
    "CorsConfig": {
      "AccessControlAllowOrigins": {
        "Items": [
          "*"
        ],
        "Quantity": 1
      },
      "AccessControlAllowHeaders": {
        "Items": [
          "*"
        ],
        "Quantity": 1
      },
      "AccessControlAllowMethods": {
        "Items": [
          "GET",
          "HEAD",
          "OPTIONS"
        ],
        "Quantity": 3
      },
      "AccessControlExposeHeaders": {
        "Items": [
          "Content-Length",
          "Content-Type",
          "Content-Range",
          "Accept-Ranges",
          "ETag"
        ],
        "Quantity": 5
      },
      "AccessControlMaxAgeSec": 3000,
      "OriginOverride": true
    }
  }
}
EOF

# 既存のポリシーを確認
EXISTING_POLICY=$(aws cloudfront list-response-headers-policies \
  --query "ResponseHeadersPolicyList.Items[?Name=='LineAppVideoCORS'].Id" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POLICY" ]; then
  echo "既存のポリシーが見つかりました: $EXISTING_POLICY"
  echo "ポリシーを更新中..."
  aws cloudfront update-response-headers-policy \
    --id "$EXISTING_POLICY" \
    --response-headers-policy-config file:///tmp/response-headers-policy.json \
    --if-match "$(aws cloudfront get-response-headers-policy --id "$EXISTING_POLICY" --query 'ETag' --output text)"
  POLICY_ID="$EXISTING_POLICY"
  echo "✅ ポリシーを更新しました: $POLICY_ID"
else
  echo "新しいポリシーを作成中..."
  POLICY_RESULT=$(aws cloudfront create-response-headers-policy \
    --response-headers-policy-config file:///tmp/response-headers-policy.json)
  POLICY_ID=$(echo "$POLICY_RESULT" | jq -r '.ResponseHeadersPolicy.ResponseHeadersPolicy.Id')
  echo "✅ ポリシーを作成しました: $POLICY_ID"
fi
echo ""

# 3. CloudFrontディストリビューションの設定を取得
echo "ステップ3: CloudFrontディストリビューションの設定を取得中..."
aws cloudfront get-distribution-config \
  --id "$DISTRIBUTION_ID" \
  --output json > /tmp/distribution-config.json

ETAG=$(jq -r '.ETag' /tmp/distribution-config.json)
CONFIG=$(jq -r '.DistributionConfig' /tmp/distribution-config.json)

# 4. ビヘイビアにレスポンスヘッダーポリシーを適用
echo "ステップ4: ビヘイビアにレスポンスヘッダーポリシーを適用中..."
UPDATED_CONFIG=$(echo "$CONFIG" | jq --arg policy_id "$POLICY_ID" '
  .DefaultCacheBehavior.ResponseHeadersPolicyId = $policy_id |
  .DefaultCacheBehavior.AllowedMethods.Items = ["GET", "HEAD", "OPTIONS"] |
  .DefaultCacheBehavior.AllowedMethods.Quantity = 3 |
  .DefaultCacheBehavior.CachedMethods.Items = ["GET", "HEAD"] |
  .DefaultCacheBehavior.CachedMethods.Quantity = 2
')

echo "$UPDATED_CONFIG" > /tmp/updated-distribution-config.json

# 5. ディストリビューションを更新
echo "ステップ5: CloudFrontディストリビューションを更新中..."
aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/updated-distribution-config.json \
  > /tmp/update-result.json

echo "✅ CloudFrontディストリビューションを更新しました"
echo ""
echo "=========================================="
echo "設定完了！"
echo "=========================================="
echo ""
echo "⚠️  重要: CloudFrontのデプロイには5-15分かかります"
echo "デプロイが完了したら、以下のコマンドでキャッシュを無効化してください:"
echo ""
echo "aws cloudfront create-invalidation \\"
echo "  --distribution-id $DISTRIBUTION_ID \\"
echo "  --paths '/*'"
echo ""
echo "または、AWSコンソールから手動で無効化してください。"
echo ""

# 一時ファイルを削除
rm -f /tmp/cors-config.json
rm -f /tmp/response-headers-policy.json
rm -f /tmp/distribution-config.json
rm -f /tmp/updated-distribution-config.json
rm -f /tmp/update-result.json



