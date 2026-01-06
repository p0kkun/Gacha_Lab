# LocalStackのセットアップスクリプト（PowerShell版）

Write-Host "🚀 LocalStackのセットアップを開始します..." -ForegroundColor Green

# Docker ComposeでLocalStackを起動
Write-Host "📦 LocalStackコンテナを起動中..." -ForegroundColor Yellow
docker-compose -f docker-compose.localstack.yml up -d

# LocalStackの起動を待つ
Write-Host "⏳ LocalStackの起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# バケット名を取得（環境変数から、またはデフォルト値）
$bucketName = if ($env:AWS_S3_BUCKET_NAME) { $env:AWS_S3_BUCKET_NAME } else { "gacha-lab-test" }

# バケットを作成
Write-Host "🪣 S3バケットを作成中: $bucketName" -ForegroundColor Yellow

# AWS CLIがインストールされているか確認
$awsCliInstalled = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCliInstalled) {
    Write-Host "⚠️  AWS CLIがインストールされていません。手動でバケットを作成してください。" -ForegroundColor Yellow
    Write-Host "   または、以下のコマンドでAWS CLIをインストール:"
    Write-Host "   winget install Amazon.AWSCLI" -ForegroundColor Cyan
} else {
    aws --endpoint-url=http://localhost:4566 s3 mb s3://$bucketName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ バケットを作成しました" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  バケットは既に存在するか、作成に失敗しました" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ LocalStackのセットアップが完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 次のステップ:" -ForegroundColor Cyan
Write-Host "1. .env.localに以下を追加:"
Write-Host "   USE_LOCALSTACK=true"
Write-Host "   AWS_S3_BUCKET_NAME=$bucketName"
Write-Host ""
Write-Host "2. 開発サーバーを起動:"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "3. LocalStackを停止する場合:"
Write-Host "   docker-compose -f docker-compose.localstack.yml down" -ForegroundColor Yellow




