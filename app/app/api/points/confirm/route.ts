import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";
import { deleteCache } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache-keys";
// PointTransactionTypeの一時的な回避策（Prismaクライアントの型解決問題のため）
const PointTransactionType = {
  PURCHASE: "PURCHASE" as const,
  CONSUME: "CONSUME" as const,
  GRANT: "GRANT" as const,
  REFUND: "REFUND" as const,
} as const;

function getStripeInstance(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY環境変数が設定されていません");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-12-15.clover",
  });
}

const resolveStripeSucceededAt = async (
  stripe: Stripe,
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
        console.error("ポイント付与確認: チャージ取得エラー:", error);
      }
    }
  }
  return new Date(createdMs);
};

const resolveStripePaymentMethodType = async (
  stripe: Stripe,
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
      console.error("ポイント付与確認: 決済手段取得エラー:", error);
    }
  }
  return paymentIntent.payment_method_types?.[0] ?? null;
};

/**
 * 決済成功時のポイント付与（Webhookのフォールバック）
 * POST /api/points/confirm
 *
 * このエンドポイントは、Webhookが呼び出されない場合のフォールバックとして使用されます。
 * PaymentIntentの状態を確認し、成功していてまだポイントが付与されていない場合にポイントを付与します。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentIntentId, userId } = body;

    if (!paymentIntentId || !userId) {
      return NextResponse.json(
        { error: "PaymentIntent IDとユーザーIDが必要です" },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();

    // PaymentIntentの状態を確認
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    console.log("ポイント付与確認:", {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });

    // 決済が成功していない場合はエラー
    if (paymentIntent.status !== "succeeded") {
      await logError(
        new Error(`決済が成功していません。状態: ${paymentIntent.status}`),
        {
          userId,
          route: "/api/points/confirm",
          customData: { paymentIntentId, status: paymentIntent.status },
        },
        request
      );
      return NextResponse.json(
        { error: `決済が成功していません。状態: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // メタデータを確認
    if (paymentIntent.metadata.type !== "point_purchase") {
      await logError(
        new Error("ポイント購入用の決済ではありません"),
        {
          userId,
          route: "/api/points/confirm",
          customData: {
            paymentIntentId,
            metadataType: paymentIntent.metadata.type,
          },
        },
        request
      );
      return NextResponse.json(
        { error: "ポイント購入用の決済ではありません" },
        { status: 400 }
      );
    }

    // メタデータのuserIdとリクエストのuserIdが一致するか確認
    if (paymentIntent.metadata.userId !== userId) {
      return NextResponse.json(
        { error: "ユーザーIDが一致しません" },
        { status: 403 }
      );
    }

    const points = parseInt(paymentIntent.metadata.points || "0", 10);
    const bonusFreePoints = parseInt(
      paymentIntent.metadata.bonusFreePoints || "0",
      10
    );
    const paymentMethodType =
      await resolveStripePaymentMethodType(stripe, paymentIntent);

    if (points <= 0 || bonusFreePoints < 0) {
      await logError(
        new Error("無効なポイント数"),
        {
          userId,
          route: "/api/points/confirm",
          customData: { paymentIntentId, points, bonusFreePoints },
        },
        request
      );
      return NextResponse.json({ error: "無効なポイント数" }, { status: 400 });
    }

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
      pointHistory: {
        findFirst: (args: {
          where: any;
          select?: any;
        }) => Promise<{ id: number } | null>;
      };
    };

    const paymentSucceededAt = await resolveStripeSucceededAt(
      stripe,
      paymentIntent
    );
    const existingLog = await prismaAny.pointPurchaseLog.findFirst({
      where: { providerPaymentIntentId: paymentIntentId },
      select: { id: true, paymentSucceededAt: true },
    });
    const purchaseLogId =
      existingLog?.id ??
      (
        await prismaAny.pointPurchaseLog.create({
          data: {
            userId,
            provider: "STRIPE",
            providerPaymentIntentId: paymentIntentId,
            amountYen: paymentIntent.amount,
            planId: paymentIntent.metadata.planId || null,
            paymentMethod: paymentMethodType,
            status: "SUCCEEDED",
            paymentSucceededAt,
            raw: {
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

    // 有償 + おまけ無償ポイントを付与（重複付与チェックは grantPurchasePoints 内で実施）
    const { grantPurchasePoints } = await import("@/lib/point-service");
    const { getPointBalances } = await import("@/lib/point-management");
    
    const grantResult = await grantPurchasePoints(
      userId,
      points,
      bonusFreePoints,
      paymentIntentId,
      purchaseLogId
    );

    // userPointBalanceキャッシュ削除（ポイント付与後）
    await deleteCache(CacheKeys.pointBalance(userId));

    // 既に付与済みの場合は、現在のポイント残高を返す
    if (grantResult.alreadyGranted) {
      console.log("既にポイントが付与されています:", {
        paymentIntentId,
        purchaseLogId,
      });
      const balances = await getPointBalances(userId);
      return NextResponse.json({
        success: true,
        alreadyGranted: true,
        points: balances.total,
      });
    }

    // 現在のポイント残高を取得
    const balances = await getPointBalances(userId);
    const result = balances.total;

    console.log(
      `ポイント付与成功: ユーザー ${userId} に 有償${points}pt / おまけ無償${bonusFreePoints}pt 付与`,
      {
        paymentIntentId,
        newBalance: result,
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      points: result,
    });
  } catch (error) {
    await logError(error, { route: "/api/points/confirm" }, request);
    return NextResponse.json(
      { error: "ポイント付与に失敗しました" },
      { status: 500 }
    );
  }
}
