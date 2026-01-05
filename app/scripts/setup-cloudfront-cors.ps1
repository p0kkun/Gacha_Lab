# CloudFrontとS3のCORS設定を自動化するPowerShellスクリプト
# 使用方法: .\setup-cloudfront-cors.ps1

# 設定変数（環境変数から取得、またはデフォルト値を使用）
$BUCKET_NAME = if ($env:S3_BUCKET_NAME) { $env:S3_BUCKET_NAME } else { "gacha-lab-test" }
$DISTRIBUTION_ID = if ($env:CLOUDFRONT_DISTRIBUTION_ID) { $env:CLOUDFRONT_DISTRIBUTION_ID } else { "E2O1UP219WO08E" }
$REGION = if ($env:S3_REGION) { $env:S3_REGION } else { "ap-northeast-1" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CloudFront & S3 CORS設定スクリプト" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "バケット名: $BUCKET_NAME"
Write-Host "ディストリビューションID: $DISTRIBUTION_ID"
Write-Host "リージョン: $REGION"
Write-Host ""

# 1. S3バケットのCORS設定
Write-Host "ステップ1: S3バケットのCORS設定を更新中..." -ForegroundColor Yellow
$corsConfig = @{
    AllowedHeaders = @("*")
    AllowedMethods = @("GET", "PUT", "POST", "DELETE", "HEAD")
    AllowedOrigins = @(
        "line://",
        "https://liff.line.me",
        "http://localhost:3000",
        "https://dev.d2zlbom9902v0u.amplifyapp.com",
        "https://*.amplifyapp.com"
    )
    ExposeHeaders = @(
        "Content-Length",
        "Content-Type",
        "Content-Range",
        "Accept-Ranges",
        "ETag",
        "x-amz-server-side-encryption",
        "x-amz-request-id",
        "x-amz-id-2",
        "x-amz-version-id"
    )
    MaxAgeSeconds = 3000
} | ConvertTo-Json -Depth 10

$corsConfigArray = @($corsConfig) | ConvertTo-Json -Depth 10

try {
    aws s3api put-bucket-cors `
        --bucket $BUCKET_NAME `
        --cors-configuration $corsConfigArray `
        --region $REGION
    Write-Host "✅ S3バケットのCORS設定を更新しました" -ForegroundColor Green
} catch {
    Write-Host "❌ S3バケットのCORS設定の更新に失敗しました: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. CloudFrontレスポンスヘッダーポリシーの作成
Write-Host "ステップ2: CloudFrontレスポンスヘッダーポリシーを作成中..." -ForegroundColor Yellow

$policyConfig = @{
    ResponseHeadersPolicyConfig = @{
        Name = "LineAppVideoCORS"
        Comment = "LINEアプリでの動画再生用CORS設定"
        CorsConfig = @{
            AccessControlAllowOrigins = @{
                Items = @("*")
                Quantity = 1
            }
            AccessControlAllowHeaders = @{
                Items = @("*")
                Quantity = 1
            }
            AccessControlAllowMethods = @{
                Items = @("GET", "HEAD", "OPTIONS")
                Quantity = 3
            }
            AccessControlExposeHeaders = @{
                Items = @(
                    "Content-Length",
                    "Content-Type",
                    "Content-Range",
                    "Accept-Ranges",
                    "ETag"
                )
                Quantity = 5
            }
            AccessControlMaxAgeSec = 3000
            OriginOverride = $true
        }
    }
} | ConvertTo-Json -Depth 10

# 既存のポリシーを確認
try {
    $existingPolicy = aws cloudfront list-response-headers-policies `
        --query "ResponseHeadersPolicyList.Items[?Name=='LineAppVideoCORS'].Id" `
        --output text 2>$null
    
    if ($existingPolicy) {
        Write-Host "既存のポリシーが見つかりました: $existingPolicy"
        Write-Host "ポリシーを更新中..."
        $etag = aws cloudfront get-response-headers-policy --id $existingPolicy --query 'ETag' --output text
        aws cloudfront update-response-headers-policy `
            --id $existingPolicy `
            --response-headers-policy-config $policyConfig `
            --if-match $etag | Out-Null
        $POLICY_ID = $existingPolicy
        Write-Host "✅ ポリシーを更新しました: $POLICY_ID" -ForegroundColor Green
    } else {
        Write-Host "新しいポリシーを作成中..."
        $result = aws cloudfront create-response-headers-policy `
            --response-headers-policy-config $policyConfig | ConvertFrom-Json
        $POLICY_ID = $result.ResponseHeadersPolicy.ResponseHeadersPolicy.Id
        Write-Host "✅ ポリシーを作成しました: $POLICY_ID" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ レスポンスヘッダーポリシーの作成/更新に失敗しました: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. CloudFrontディストリビューションの設定を取得
Write-Host "ステップ3: CloudFrontディストリビューションの設定を取得中..." -ForegroundColor Yellow
try {
    $distConfig = aws cloudfront get-distribution-config --id $DISTRIBUTION_ID | ConvertFrom-Json
    $ETAG = $distConfig.ETag
    $CONFIG = $distConfig.DistributionConfig
} catch {
    Write-Host "❌ ディストリビューション設定の取得に失敗しました: $_" -ForegroundColor Red
    exit 1
}

# 4. ビヘイビアにレスポンスヘッダーポリシーを適用
Write-Host "ステップ4: ビヘイビアにレスポンスヘッダーポリシーを適用中..." -ForegroundColor Yellow
$CONFIG.DefaultCacheBehavior.ResponseHeadersPolicyId = $POLICY_ID
$CONFIG.DefaultCacheBehavior.AllowedMethods.Items = @("GET", "HEAD", "OPTIONS")
$CONFIG.DefaultCacheBehavior.AllowedMethods.Quantity = 3
$CONFIG.DefaultCacheBehavior.CachedMethods.Items = @("GET", "HEAD")
$CONFIG.DefaultCacheBehavior.CachedMethods.Quantity = 2

# 5. ディストリビューションを更新
Write-Host "ステップ5: CloudFrontディストリビューションを更新中..." -ForegroundColor Yellow
try {
    $updatedConfig = $CONFIG | ConvertTo-Json -Depth 20
    $updatedConfig | Out-File -FilePath "$env:TEMP\updated-distribution-config.json" -Encoding UTF8
    
    aws cloudfront update-distribution `
        --id $DISTRIBUTION_ID `
        --if-match $ETAG `
        --distribution-config file://$env:TEMP\updated-distribution-config.json | Out-Null
    
    Write-Host "✅ CloudFrontディストリビューションを更新しました" -ForegroundColor Green
} catch {
    Write-Host "❌ ディストリビューションの更新に失敗しました: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "設定完了！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  重要: CloudFrontのデプロイには5-15分かかります" -ForegroundColor Yellow
Write-Host "デプロイが完了したら、以下のコマンドでキャッシュを無効化してください:" -ForegroundColor Yellow
Write-Host ""
Write-Host "aws cloudfront create-invalidation \`" -ForegroundColor White
Write-Host "  --distribution-id $DISTRIBUTION_ID \`" -ForegroundColor White
Write-Host "  --paths '/*'" -ForegroundColor White
Write-Host ""



