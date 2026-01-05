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
const LOCALSTACK_ENDPOINT = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';

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
        execSync(
          `aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3 mb s3://${BUCKET_NAME}`,
          { stdio: 'inherit' }
        );
        console.log('✅ バケットを作成しました\n');
      } catch (error) {
        // バケットが既に存在する場合はエラーになるが、問題ない
        console.log('ℹ️  バケットは既に存在します\n');
      }
    } catch (error) {
      console.log('⚠️  AWS CLIがインストールされていません');
      console.log('   手動でバケットを作成してください:');
      console.log(`   aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3 mb s3://${BUCKET_NAME}\n`);
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



