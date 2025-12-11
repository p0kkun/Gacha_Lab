import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripeInstance(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY環境変数が設定されていません");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-11-17.clover",
  });
}

/**
 * ポイント購入用のPaymentIntentを作成
 * POST /api/points/purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, userId, points } = body;

    if (!amount || !userId || !points) {
      return NextResponse.json(
        { error: "金額、ユーザーID、ポイント数が必要です" },
        { status: 400 }
      );
    }

    // ポイントと金額のバリデーション
    if (points <= 0) {
      return NextResponse.json(
        { error: "ポイント数は1以上である必要があります" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "金額は1以上である必要があります" },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();

    // PaymentIntentを作成
    // PayPayはリダイレクト型の決済方法なので、allow_redirectsを設定
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // 金額（円単位）
      currency: "jpy", // PayPayを使用する場合はjpyが必須
      metadata: {
        userId,
        points: points.toString(),
        type: "point_purchase",
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "always", // PayPayなどのリダイレクトが必要な決済方法を有効化
      },
    });

    console.log("PaymentIntent作成成功:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      payment_method_types: paymentIntent.payment_method_types,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("ポイント購入PaymentIntent作成エラー:", error);
    return NextResponse.json(
      { error: "ポイント購入の処理に失敗しました" },
      { status: 500 }
    );
  }
}
