/**
 * デジタルウォレット（Apple Pay、Google Payなど）用ドメイン登録スクリプト
 * 
 * このスクリプトは、StripeのPayment Method Domain APIを使用して、
 * Apple Pay、Google Payなどのデジタルウォレット決済に必要なドメインを登録します。
 * 
 * 使用方法:
 *   tsx scripts/register-payment-method-domain.ts <domain>
 * 
 * 例:
 *   tsx scripts/register-payment-method-domain.ts dev.d2zlbom9902v0u.amplifyapp.com
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

async function registerDomain(domain: string) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY環境変数が設定されていません');
      process.exit(1);
    }

    console.log(`📝 ドメイン "${domain}" をデジタルウォレット（Apple Pay、Google Payなど）に登録中...`);

    // Payment Method Domainを登録
    // このドメイン登録により、Apple Pay、Google Payなどのデジタルウォレット決済が有効になります
    const paymentMethodDomain = await stripe.paymentMethodDomains.create({
      domain_name: domain,
    });

    console.log(`✅ ドメイン登録成功！`);
    console.log(`   ドメインID: ${paymentMethodDomain.id}`);
    console.log(`   ドメイン: ${paymentMethodDomain.domain_name}`);
    console.log(`   ステータス: ${paymentMethodDomain.status}`);
    console.log(`   ℹ️  このドメインで以下のデジタルウォレットが利用可能になります:`);
    console.log(`      - Apple Pay`);
    console.log(`      - Google Pay`);
    console.log(`      - その他のデジタルウォレット`);
  } catch (error: any) {
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('already exists') || error.code === 'resource_already_exists') {
        console.log(`ℹ️  ドメイン "${domain}" は既に登録されています`);
      } else {
        console.error(`❌ エラー: ${error.message}`);
        process.exit(1);
      }
    } else {
      console.error('❌ 予期しないエラー:', error);
      process.exit(1);
    }
  }
}

// コマンドライン引数からドメインを取得
const domain = process.argv[2];

if (!domain) {
  console.error('❌ 使用方法: tsx scripts/register-payment-method-domain.ts <domain>');
  console.error('   例: tsx scripts/register-payment-method-domain.ts dev.d2zlbom9902v0u.amplifyapp.com');
  process.exit(1);
}

registerDomain(domain);

