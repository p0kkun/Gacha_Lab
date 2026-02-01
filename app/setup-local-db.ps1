# ローカルデータベース構築スクリプト
# このスクリプトは、ローカル開発環境のデータベース構築を自動化します

param(
    [string]$PostgresPassword = "postgres",
    [string]$PostgresUser = "postgres",
    [string]$PostgresHost = "localhost",
    [int]$PostgresPort = 5432,
    [string]$DatabaseName = "gacha_lab"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ローカルデータベース構築スクリプト" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. PostgreSQL接続確認
Write-Host "[1/7] PostgreSQL接続確認中..." -ForegroundColor Yellow
$env:PGPASSWORD = $PostgresPassword
try {
    $version = psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQLへの接続に失敗しました。PostgreSQLが起動しているか確認してください。"
    }
    Write-Host "✅ PostgreSQL接続成功" -ForegroundColor Green
} catch {
    Write-Host "❌ エラー: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "PostgreSQLが起動していない可能性があります。" -ForegroundColor Yellow
    Write-Host "以下のいずれかの方法でPostgreSQLを起動してください:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQLを直接インストールした場合: サービスが起動しているか確認" -ForegroundColor Yellow
    Write-Host "  2. Dockerを使用する場合: docker start gacha-lab-postgres" -ForegroundColor Yellow
    exit 1
}

# 2. データベースの存在確認と作成
Write-Host "[2/7] データベース '$DatabaseName' の確認中..." -ForegroundColor Yellow
$dbExists = psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -c "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';" 2>&1 | Select-String -Pattern "1 row"
if (-not $dbExists) {
    Write-Host "データベース '$DatabaseName' が存在しないため、作成します..." -ForegroundColor Yellow
    $createDb = psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -c "CREATE DATABASE $DatabaseName;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ データベース作成に失敗しました: $createDb" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ データベース '$DatabaseName' を作成しました" -ForegroundColor Green
} else {
    Write-Host "✅ データベース '$DatabaseName' は既に存在します" -ForegroundColor Green
}

# 3. .env.localの確認
Write-Host "[3/7] 環境変数ファイルの確認中..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️ 警告: .env.local が見つかりません" -ForegroundColor Yellow
    Write-Host "以下の内容で .env.local を作成してください:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "DATABASE_URL=`"postgresql://$PostgresUser`:$PostgresPassword@$PostgresHost`:$PostgresPort/$DatabaseName?schema=public`"" -ForegroundColor Cyan
    Write-Host "NEXT_PUBLIC_LIFF_ID=2008642684-d8jPmggE" -ForegroundColor Cyan
    Write-Host "NEXT_PUBLIC_ADMIN_PASSWORD=admin" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "続行しますか？ (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
} else {
    Write-Host "✅ .env.local が見つかりました" -ForegroundColor Green
    # DATABASE_URLの確認
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -notmatch "DATABASE_URL") {
        Write-Host "⚠️ 警告: .env.local に DATABASE_URL が設定されていません" -ForegroundColor Yellow
    }
}

# 4. npmパッケージのインストール
Write-Host "[4/7] npmパッケージのインストール中..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install を実行します..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install に失敗しました" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ npmパッケージのインストールが完了しました" -ForegroundColor Green
} else {
    Write-Host "✅ node_modules は既に存在します（スキップ）" -ForegroundColor Green
}

# 5. Prismaクライアントの生成
Write-Host "[5/7] Prismaクライアントの生成中..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prismaクライアントの生成に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prismaクライアントの生成が完了しました" -ForegroundColor Green

# 6. マイグレーションの実行
Write-Host "[6/7] データベースマイグレーション実行中..." -ForegroundColor Yellow
Write-Host "マイグレーション名を入力してください（Enterで 'init' を使用）:" -ForegroundColor Yellow
$migrationName = Read-Host
if ([string]::IsNullOrWhiteSpace($migrationName)) {
    $migrationName = "init"
}

npm run db:migrate -- --name $migrationName
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ マイグレーションに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✅ マイグレーションが完了しました" -ForegroundColor Green

# 7. シードデータの投入
Write-Host "[7/7] シードデータの投入中..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ シードデータの投入に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✅ シードデータの投入が完了しました" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 ローカルデータベース構築が完了しました！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "次のコマンドでデータベースを確認できます:" -ForegroundColor Yellow
Write-Host "  npm run db:studio" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prisma Studioが起動し、ブラウザで http://localhost:5555 が開きます。" -ForegroundColor Yellow
Write-Host ""







