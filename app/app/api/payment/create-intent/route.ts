import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripeインスタンスは関数内で作成（モジュールレベルでは作成しない）
function getStripeInstance(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey || stripeSecretKey === '') {
    throw new Error('STRIPE_SECRET_KEY環境変数が設定されていません');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    // STRIPE_SECRET_KEYの検証
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecretKey || stripeSecretKey === '') {
      console.error('STRIPE_SECRET_KEY環境変数が設定されていません', {
        hasEnvVar: !!process.env.STRIPE_SECRET_KEY,
        envVarLength: process.env.STRIPE_SECRET_KEY?.length,
        envVarPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
      });
      return NextResponse.json(
        { error: '決済システムの設定が完了していません。管理者にお問い合わせください。' },
        { status: 500 }
      );
    }

    // Stripeインスタンスを作成（環境変数が設定されている場合のみ）
    const stripe = getStripeInstance();

    const body = await request.json();
    const { amount, userId, gachaTypeId } = body;

    if (!amount || !userId) {
      return NextResponse.json(
        { error: '金額とユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // PaymentIntentを作成（テストモード）
    // PaymentElementを使用する場合は、automatic_payment_methodsを使用する
    // automatic_payment_methodsとpayment_method_typesは同時に使用できない
    // Google Payを明示的に有効にするため、allow_redirectsを設定
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // 金額（円単位、例: 1000 = 1000円）
      currency: 'jpy', // PayPayを使用する場合はjpyが必須
      automatic_payment_methods: {
        enabled: true, // PaymentElementで利用可能なすべての決済方法を自動的に有効化
        allow_redirects: 'always', // Google Payなどのリダイレクトが必要な決済方法を有効化
      },
      metadata: {
        userId: userId,
        gachaTypeId: gachaTypeId || '',
      },
      // テストモードでは自動的にテスト決済になる
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('PaymentIntent作成エラー:', error);
    return NextResponse.json(
      { error: '決済の準備に失敗しました' },
      { status: 500 }
    );
  }
}

