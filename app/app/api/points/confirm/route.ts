import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
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
    throw new Error('STRIPE_SECRET_KEY環境変数が設定されていません');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

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
        { error: 'PaymentIntent IDとユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();

    // PaymentIntentの状態を確認
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('ポイント付与確認:', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });

    // 決済が成功していない場合はエラー
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `決済が成功していません。状態: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // メタデータを確認
    if (paymentIntent.metadata.type !== 'point_purchase') {
      return NextResponse.json(
        { error: 'ポイント購入用の決済ではありません' },
        { status: 400 }
      );
    }

    // メタデータのuserIdとリクエストのuserIdが一致するか確認
    if (paymentIntent.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが一致しません' },
        { status: 403 }
      );
    }

    const points = parseInt(paymentIntent.metadata.points || '0', 10);

    if (points <= 0) {
      return NextResponse.json(
        { error: '無効なポイント数' },
        { status: 400 }
      );
    }

    // 既にポイントが付与されているか確認（重複付与を防ぐ）
    const existingHistory = await prisma.pointHistory.findFirst({
      where: {
        stripePaymentId: paymentIntentId,
        transactionType: PointTransactionType.PURCHASE,
      },
    });

    if (existingHistory) {
      console.log('既にポイントが付与されています:', {
        paymentIntentId,
        historyId: existingHistory.id,
      });
      // 既に付与されている場合は、現在のポイント残高を返す
      const { getPointBalances } = await import('@/lib/point-management');
      const balances = await getPointBalances(userId);

      return NextResponse.json({
        success: true,
        alreadyGranted: true,
        points: balances.total,
      });
    }

    // 有償ポイントを付与（有効期限は最終更新日から1年後）
    const { grantPaidPoints, getPointBalances } = await import('@/lib/point-management');
    await grantPaidPoints(
      userId,
      points,
      null, // 有効期限は自動設定（最終更新日から1年後）
      `${points}ポイント購入`,
      paymentIntentId
    );

    // 現在のポイント残高を取得
    const balances = await getPointBalances(userId);
    const result = balances.total;

    console.log(`ポイント付与成功: ユーザー ${userId} に ${points}ポイント付与`, {
      paymentIntentId,
      newBalance: result,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      points: result,
    });
  } catch (error) {
    console.error('ポイント付与エラー:', error);
    return NextResponse.json(
      { error: 'ポイント付与に失敗しました' },
      { status: 500 }
    );
  }
}

