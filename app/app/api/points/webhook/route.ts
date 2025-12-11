import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { PointTransactionType } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Stripe Webhook: ポイント購入の決済完了を処理
 * POST /api/points/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    console.log('Webhook受信:', {
      hasSignature: !!signature,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    });

    if (!signature) {
      console.error('Webhook: 署名がありません');
      return NextResponse.json(
        { error: '署名がありません' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('Webhook: STRIPE_WEBHOOK_SECRETが設定されていません');
      return NextResponse.json(
        { error: 'Webhook secretが設定されていません' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook署名検証成功:', {
        type: event.type,
        id: event.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Webhook署名検証エラー:', err);
      return NextResponse.json(
        { error: '署名検証に失敗しました' },
        { status: 400 }
      );
    }

    // 決済成功イベントを処理
    if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    console.log('Webhook: payment_intent.succeeded', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      payment_method: paymentIntent.payment_method,
      metadata: paymentIntent.metadata,
    });

    // ポイント購入のメタデータを確認
    console.log('Webhook: メタデータ確認:', {
      metadata: paymentIntent.metadata,
      type: paymentIntent.metadata.type,
    });

    if (paymentIntent.metadata.type === 'point_purchase') {
      const userId = paymentIntent.metadata.userId;
      const points = parseInt(paymentIntent.metadata.points || '0', 10);

      console.log('Webhook: ポイント購入処理開始:', {
        userId,
        points,
        paymentIntentId: paymentIntent.id,
      });

      if (!userId || points <= 0) {
        console.error('Webhook: 無効なメタデータ:', paymentIntent.metadata);
        return NextResponse.json(
          { error: '無効なメタデータ' },
          { status: 400 }
        );
      }

      try {
        // トランザクション内でポイントを追加
        await prisma.$transaction(async (tx) => {
          // ユーザーの現在のポイント残高を取得
          const user = await tx.user.findUnique({
            where: { userId },
            select: { points: true },
          });

          if (!user) {
            throw new Error('ユーザーが見つかりません');
          }

          const newBalance = user.points + points;

          // ポイント残高を更新
          await tx.user.update({
            where: { userId },
            data: { points: newBalance },
          });

          // ポイント履歴を記録
          await tx.pointHistory.create({
            data: {
              userId,
              transactionType: PointTransactionType.PURCHASE,
              amount: points,
              balanceAfter: newBalance,
              description: `${points}ポイント購入`,
              stripePaymentId: paymentIntent.id,
            },
          });
        });

        console.log(`Webhook: ポイント購入成功: ユーザー ${userId} に ${points}ポイント付与`, {
          paymentIntentId: paymentIntent.id,
          paymentMethod: paymentIntent.payment_method,
          amount: paymentIntent.amount,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Webhook: ポイント付与エラー:', error);
        return NextResponse.json(
          { error: 'ポイント付与に失敗しました' },
          { status: 500 }
        );
      }
    } else {
      console.log('Webhook: ポイント購入以外の決済:', {
        type: paymentIntent.metadata.type,
        paymentIntentId: paymentIntent.id,
      });
    }
  } else {
    console.log('Webhook: その他のイベント:', {
      type: event.type,
      id: event.id,
    });
  }

  return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook: 予期しないエラー:', error);
    return NextResponse.json(
      { error: 'Webhook処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

