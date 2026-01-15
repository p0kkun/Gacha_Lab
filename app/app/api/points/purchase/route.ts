import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

function getStripeInstance(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY環境変数が設定されていません");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-12-15.clover",
  });
}

/**
 * ポイント購入用のPaymentIntentを作成
 * POST /api/points/purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, planId, amount, points } = body as {
      userId?: string;
      planId?: string;
      amount?: number;
      points?: number;
    };

    if (!userId) {
      await logError(
        new Error("ユーザーIDが必要です"),
        { route: "/api/points/purchase", customData: { body } },
        request
      );
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    // サーバー側で購入プランを確定（クライアントからのamount/pointsは信用しない）
    // - 基本は planId を使う
    // - 後方互換のため、planId が無い場合のみ (amount, points) が一致するDBプランを探す
    const normalizedPlanId =
      typeof planId === "string" && planId.trim() !== "" ? planId.trim() : null;

    let plan = normalizedPlanId
      ? await prisma.pointPurchasePlan.findUnique({
          where: { id: normalizedPlanId },
        })
      : null;

    if (!plan && amount !== undefined && points !== undefined) {
      const amt = typeof amount === "number" ? amount : Number(amount);
      const pts = typeof points === "number" ? points : Number(points);
      if (Number.isFinite(amt) && Number.isFinite(pts) && amt > 0 && pts > 0) {
        plan = await prisma.pointPurchasePlan.findFirst({
          where: {
            isActive: true,
            price: amt,
            points: pts,
          },
        });
      }
    }

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "無効な購入プランです" },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();

    // PaymentIntentを作成
    // PayPayはリダイレクト型の決済方法なので、allow_redirectsを設定
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price, // 金額（円単位）
      currency: "jpy", // PayPayを使用する場合はjpyが必須
      metadata: {
        userId,
        planId: plan.id,
        points: plan.points.toString(),
        bonusFreePoints: (plan.bonusFreePoints ?? 0).toString(),
        amount: plan.price.toString(),
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
    await logError(error, { route: "/api/points/purchase" }, request);
    return NextResponse.json(
      { error: "ポイント購入の処理に失敗しました" },
      { status: 500 }
    );
  }
}
