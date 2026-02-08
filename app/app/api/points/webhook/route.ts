import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
// PointTransactionTypeの一時的な回避策（Prismaクライアントの型解決問題のため）
const PointTransactionType = {
  PURCHASE: "PURCHASE" as const,
  CONSUME: "CONSUME" as const,
  GRANT: "GRANT" as const,
  REFUND: "REFUND" as const,
} as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const resolveStripeSucceededAt = async (
  paymentIntent: Stripe.PaymentIntent
): Promise<Date> => {
  let createdMs = paymentIntent.created * 1000;
  const latestCharge = paymentIntent.latest_charge;
  if (latestCharge) {
    const chargeId =
      typeof latestCharge === "string" ? latestCharge : latestCharge.id;
    if (chargeId) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        if (charge?.created) {
          createdMs = charge.created * 1000;
        }
      } catch (error) {
        console.error("Webhook: チャージ取得エラー:", error);
      }
    }
  }
  return new Date(createdMs);
};

const resolveStripePaymentMethodType = async (
  paymentIntent: Stripe.PaymentIntent
): Promise<string | null> => {
  const latestCharge = paymentIntent.latest_charge;
  const chargeId =
    typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      const type = charge?.payment_method_details?.type;
      if (type) return type;
    } catch (error) {
      console.error("Webhook: 決済手段取得エラー:", error);
    }
  }
  return paymentIntent.payment_method_types?.[0] ?? null;
};

/**
 * Stripe Webhook: ポイント購入の決済完了を処理
 * POST /api/points/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    console.log("Webhook受信:", {
      hasSignature: !!signature,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    });

    if (!signature) {
      console.error("Webhook: 署名がありません");
      return NextResponse.json({ error: "署名がありません" }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error("Webhook: STRIPE_WEBHOOK_SECRETが設定されていません");
      return NextResponse.json(
        { error: "Webhook secretが設定されていません" },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("Webhook署名検証成功:", {
        type: event.type,
        id: event.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Webhook署名検証エラー:", err);
      return NextResponse.json(
        { error: "署名検証に失敗しました" },
        { status: 400 }
      );
    }

    // 決済成功イベントを処理
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log("Webhook: payment_intent.succeeded", {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method,
        metadata: paymentIntent.metadata,
      });

      // ポイント購入のメタデータを確認
      console.log("Webhook: メタデータ確認:", {
        metadata: paymentIntent.metadata,
        type: paymentIntent.metadata.type,
      });

      if (paymentIntent.metadata.type === "point_purchase") {
        const userId = paymentIntent.metadata.userId;
        const points = parseInt(paymentIntent.metadata.points || "0", 10);
        const bonusFreePoints = parseInt(
          paymentIntent.metadata.bonusFreePoints || "0",
          10
        );
        const paymentMethodType =
          await resolveStripePaymentMethodType(paymentIntent);

        console.log("Webhook: ポイント購入処理開始:", {
          userId,
          points,
          paymentIntentId: paymentIntent.id,
        });

        if (!userId || points <= 0 || bonusFreePoints < 0) {
          console.error("Webhook: 無効なメタデータ:", paymentIntent.metadata);
          return NextResponse.json(
            { error: "無効なメタデータ" },
            { status: 400 }
          );
        }

        try {
          const paymentSucceededAt =
            await resolveStripeSucceededAt(paymentIntent);
          // 購入ログ（PointPurchaseLog）を作成/再利用（idempotent）
          const prismaAny = prisma as unknown as {
            pointPurchaseLog: {
              findFirst: (args: {
                where: { providerPaymentIntentId: string };
                select: { id: true; paymentSucceededAt: true };
              }) => Promise<{ id: number; paymentSucceededAt: Date | null } | null>;
              create: (args: { data: any }) => Promise<{ id: number }>;
              update: (args: {
                where: { id: number };
                data: { paymentSucceededAt: Date; paymentMethod?: string | null };
              }) => Promise<{ id: number }>;
            };
          };
          const existingLog = await prismaAny.pointPurchaseLog.findFirst({
            where: { providerPaymentIntentId: paymentIntent.id },
            select: { id: true, paymentSucceededAt: true },
          });
          const purchaseLogId =
            existingLog?.id ??
            (
              await prismaAny.pointPurchaseLog.create({
                data: {
                  userId,
                  provider: "STRIPE",
                  providerPaymentIntentId: paymentIntent.id,
                  amountYen: paymentIntent.amount,
                  planId: paymentIntent.metadata.planId || null,
                  paymentMethod: paymentMethodType,
                  status: "SUCCEEDED",
                  paymentSucceededAt,
                  raw: {
                    eventId: event.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    metadata: paymentIntent.metadata,
                  },
                },
              })
            ).id;
          if (existingLog?.id && !existingLog.paymentSucceededAt) {
            await prismaAny.pointPurchaseLog.update({
              where: { id: existingLog.id },
              data: { paymentSucceededAt, paymentMethod: paymentMethodType },
            });
          }

          // 有償 + おまけ無償ポイントを付与（有効期限は最終更新日から180日後、重複付与は防止）
          const { grantPurchasePoints } = await import('@/lib/point-service');
          await grantPurchasePoints(
            userId,
            points,
            bonusFreePoints,
            paymentIntent.id,
            purchaseLogId
          );

          console.log(
            `Webhook: ポイント購入成功: ユーザー ${userId} に 有償${points}pt / おまけ無償${bonusFreePoints}pt 付与`,
            {
              paymentIntentId: paymentIntent.id,
              paymentMethod: paymentIntent.payment_method,
              amount: paymentIntent.amount,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (error) {
          console.error("Webhook: ポイント付与エラー:", error);
          return NextResponse.json(
            { error: "ポイント付与に失敗しました" },
            { status: 500 }
          );
        }
      } else {
        console.log("Webhook: ポイント購入以外の決済:", {
          type: paymentIntent.metadata.type,
          paymentIntentId: paymentIntent.id,
        });
      }
    } else {
      console.log("Webhook: その他のイベント:", {
        type: event.type,
        id: event.id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook: 予期しないエラー:", error);
    return NextResponse.json(
      { error: "Webhook処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
