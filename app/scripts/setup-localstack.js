#!/usr/bin/env node

/**
 * LocalStackのセットアップスクリプト（Node.js版）
 * 
 * 使用方法:
 *   node scripts/setup-localstack.js
 *   npm run localstack:setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'gacha-lab-test';
// Windowsでは localhost がIPv6(::1)に解決され、接続が不安定になることがあるため IPv4 をデフォルトにする
const LOCALSTACK_ENDPOINT = process.env.LOCALSTACK_ENDPOINT || 'http://127.0.0.1:4566';
const CORS_FILE = path.join(__dirname, 'localstack-s3-cors.json');

function execAws(cmd) {
  // LocalStack向け: ダミー認証情報を強制（aws configure不要にする）
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'test',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'ap-northeast-1',
  };
  execSync(cmd, { stdio: 'inherit', env });
}

console.log('🚀 LocalStackのセットアップを開始します...\n');

// Docker ComposeでLocalStackを起動
console.log('📦 LocalStackコンテナを起動中...');
try {
  execSync('docker-compose -f docker-compose.localstack.yml up -d', { stdio: 'inherit' });
  console.log('✅ LocalStackコンテナを起動しました\n');
} catch (error) {
  console.error('❌ LocalStackコンテナの起動に失敗しました');
  console.error('   Docker Desktopが起動しているか確認してください');
  process.exit(1);
}

// LocalStackの起動を待つ
console.log('⏳ LocalStackの起動を待機中（10秒）...');
setTimeout(() => {
  // バケットを作成
  console.log(`🪣 S3バケットを作成中: ${BUCKET_NAME}`);
  
  try {
    // AWS CLIがインストールされているか確認
    try {
      execSync('aws --version', { stdio: 'ignore' });
      
      // バケットを作成
      try {
        execAws(`aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3 mb s3://${BUCKET_NAME}`);
        console.log('✅ バケットを作成しました\n');
      } catch (error) {
        // バケットが既に存在する場合はエラーになるが、問題ない
        console.log('ℹ️  バケットは既に存在します\n');
      }

      // CORSを設定（Presigned PUTのプリフライト対策）
      if (fs.existsSync(CORS_FILE)) {
        console.log('🌐 S3バケットのCORS設定を適用中...');
        try {
          // WindowsのAWS CLIは file:///C:/... をパラメータファイルとして読めない場合があるため、
          // scriptsディレクトリに移動して相対パスで渡す（スペース/ドライブレター問題を回避）
          const prevCwd = process.cwd();
          process.chdir(__dirname);
          execAws(
            `aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3api put-bucket-cors --bucket ${BUCKET_NAME} --cors-configuration "file://localstack-s3-cors.json"`
          );
          process.chdir(prevCwd);
          console.log('✅ CORS設定を適用しました\n');
        } catch (error) {
          try {
            process.chdir(path.resolve(__dirname, '..'));
          } catch (_) {}
          console.log('⚠️  CORS設定の適用に失敗しました（必要に応じて手動で設定してください）\n');
        }
      } else {
        console.log('⚠️  CORS設定ファイルが見つかりません:', CORS_FILE);
      }
    } catch (error) {
      console.log('⚠️  AWS CLIがインストールされていません');
      console.log('   手動でバケットを作成してください:');
      console.log(`   aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3 mb s3://${BUCKET_NAME}\n`);
      console.log('   さらに、Presigned URLのPUTを行う場合はCORS設定が必要です:');
      console.log(`   （例）aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3api put-bucket-cors --bucket ${BUCKET_NAME} --cors-configuration file://${CORS_FILE}\n`);
    }
  } catch (error) {
    console.error('❌ バケットの作成に失敗しました');
  }

  console.log('✅ LocalStackのセットアップが完了しました！\n');
  console.log('📝 次のステップ:');
  console.log('1. .env.localに以下を追加:');
  console.log('   USE_LOCALSTACK=true');
  console.log(`   AWS_S3_BUCKET_NAME=${BUCKET_NAME}`);
  console.log('');
  console.log('2. 開発サーバーを起動:');
  console.log('   npm run dev');
  console.log('');
  console.log('3. LocalStackを停止する場合:');
  console.log('   npm run localstack:down');
}, 10000);




