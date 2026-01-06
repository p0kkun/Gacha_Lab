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
    # LocalStack向けにダミー認証情報を設定（aws configure不要）
    if (-not $env:AWS_ACCESS_KEY_ID) { $env:AWS_ACCESS_KEY_ID = "test" }
    if (-not $env:AWS_SECRET_ACCESS_KEY) { $env:AWS_SECRET_ACCESS_KEY = "test" }
    if (-not $env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION = "ap-northeast-1" }

    $endpoint = if ($env:LOCALSTACK_ENDPOINT) { $env:LOCALSTACK_ENDPOINT } else { "http://127.0.0.1:4566" }

    aws --endpoint-url=$endpoint s3 mb s3://$bucketName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ バケットを作成しました" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  バケットは既に存在するか、作成に失敗しました" -ForegroundColor Yellow
    }

    # CORS設定（Presigned PUTのプリフライト対策）
    $corsFile = Join-Path $PSScriptRoot "localstack-s3-cors.json"
    if (Test-Path $corsFile) {
        Write-Host "🌐 S3バケットのCORS設定を適用中..." -ForegroundColor Yellow
        # WindowsのAWS CLIは file:///C:/... をパラメータファイルとして読めない場合があるため
        # スクリプトディレクトリに移動して相対パスで渡す（スペース/ドライブレター問題を回避）
        Push-Location $PSScriptRoot
        aws --endpoint-url=$endpoint s3api put-bucket-cors --bucket $bucketName --cors-configuration "file://localstack-s3-cors.json" 2>$null
        Pop-Location
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ CORS設定を適用しました" -ForegroundColor Green
        } else {
            Write-Host "⚠️  CORS設定の適用に失敗しました（必要に応じて手動で設定してください）" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  CORS設定ファイルが見つかりません: $corsFile" -ForegroundColor Yellow
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




