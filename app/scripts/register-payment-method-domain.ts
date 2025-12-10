/**
 * デジタルウォレット（Apple Pay、Google Payなど）用ドメイン登録スクリプト
 *
 * このスクリプトは、StripeのPayment Method Domain APIを使用して、
 * Apple Pay、Google Payなどのデジタルウォレット決済に必要なドメインを登録します。
 *
 * Google Payを使用するには、すべてのウェブドメイン（本番環境とテスト版のトップレベルドメインとサブドメイン）を登録する必要があります。
 * wwwサブドメインも必要に応じて登録されます。
 *
 * 使用方法:
 *   tsx scripts/register-payment-method-domain.ts <domain>
 *
 * 例:
 *   tsx scripts/register-payment-method-domain.ts dev.d2zlbom9902v0u.amplifyapp.com
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

/**
 * ドメインを登録
 */
async function registerDomain(domain: string) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY環境変数が設定されていません");
      process.exit(1);
    }

    console.log(
      `📝 ドメイン "${domain}" をデジタルウォレット（Apple Pay、Google Payなど）に登録中...`
    );

    // Payment Method Domainを登録
    // このドメイン登録により、Apple Pay、Google Payなどのデジタルウォレット決済が有効になります
    const paymentMethodDomain = await stripe.paymentMethodDomains.create({
      domain_name: domain,
    });

    console.log(`✅ ドメイン登録成功！`);
    console.log(`   ドメインID: ${paymentMethodDomain.id}`);
    console.log(`   ドメイン: ${paymentMethodDomain.domain_name}`);
    console.log(
      `   ℹ️  このドメインで以下のデジタルウォレットが利用可能になります:`
    );
    console.log(`      - Apple Pay`);
    console.log(`      - Google Pay`);
    console.log(`      - その他のデジタルウォレット`);

    return paymentMethodDomain;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "type" in error) {
      const stripeError = error as {
        type: string;
        message?: string;
        code?: string;
      };
      if (stripeError.type === "StripeInvalidRequestError") {
        if (
          stripeError.message?.includes("already exists") ||
          stripeError.code === "resource_already_exists"
        ) {
          console.log(`ℹ️  ドメイン "${domain}" は既に登録されています`);
          return null;
        } else {
          console.error(`❌ エラー: ${stripeError.message || "不明なエラー"}`);
          throw error;
        }
      }
    }
    console.error("❌ 予期しないエラー:", error);
    throw error;
  }
}

/**
 * 登録済みドメインを一覧表示
 */
async function listDomains() {
  try {
    const domains = await stripe.paymentMethodDomains.list({ limit: 100 });
    console.log(`\n📋 登録済みドメイン一覧 (${domains.data.length}件):`);
    domains.data.forEach((domain) => {
      console.log(`   - ${domain.domain_name} (ID: ${domain.id})`);
    });
    return domains.data;
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "不明なエラー";
    console.error("❌ ドメイン一覧の取得に失敗しました:", errorMessage);
    return [];
  }
}

/**
 * メイン処理
 */
async function main() {
  const domain = process.argv[2];

  if (!domain) {
    console.error(
      "❌ 使用方法: tsx scripts/register-payment-method-domain.ts <domain>"
    );
    console.error(
      "   例: tsx scripts/register-payment-method-domain.ts dev.d2zlbom9902v0u.amplifyapp.com"
    );
    console.error(
      "\n💡 ヒント: ドメインを登録すると、Google PayとApple Payが有効になります。"
    );
    process.exit(1);
  }

  try {
    // メインドメインを登録
    await registerDomain(domain);

    // wwwサブドメインがある場合（例: example.com → www.example.com）
    // ただし、amplifyapp.comのようなサブドメインの場合はwwwは不要
    const isTopLevelDomain =
      !domain.includes(".") || domain.split(".").length === 2;
    if (isTopLevelDomain && !domain.startsWith("www.")) {
      const wwwDomain = `www.${domain}`;
      console.log(`\n📝 wwwサブドメイン "${wwwDomain}" も登録中...`);
      try {
        await registerDomain(wwwDomain);
      } catch {
        // wwwサブドメインの登録に失敗しても続行
        console.log(`ℹ️  wwwサブドメインの登録をスキップしました`);
      }
    }

    // 登録済みドメインを表示
    console.log("\n");
    await listDomains();

    console.log("\n✅ ドメイン登録処理が完了しました！");
    console.log("💡 Google Payが表示されない場合は、以下を確認してください:");
    console.log("   1. StripeダッシュボードでGoogle Payが有効になっているか");
    console.log("   2. ChromeブラウザでGoogleアカウントにログインしているか");
    console.log("   3. HTTPS接続でアクセスしているか（本番環境では必須）");
  } catch {
    console.error("❌ ドメイン登録に失敗しました");
    process.exit(1);
  }
}

main();
