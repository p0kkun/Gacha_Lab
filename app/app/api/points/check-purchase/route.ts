import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

/**
 * PaymentIntent IDで購入ログの存在を確認（Webhook処理完了の判定）
 * GET /api/points/check-purchase?paymentIntentId=xxx&userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');
    const userId = searchParams.get('userId');

    if (!paymentIntentId || !userId) {
      return NextResponse.json(
        { error: 'paymentIntentIdとuserIdが必要です' },
        { status: 400 }
      );
    }

    // PointPurchaseLogを検索
    const prismaAny = prisma as unknown as {
      pointPurchaseLog: {
        findFirst: (args: {
          where: { providerPaymentIntentId: string; userId: string };
          select: { id: true; status: true; paymentSucceededAt: true };
        }) => Promise<{ id: number; status: string; paymentSucceededAt: Date | null } | null>;
      };
    };

    const purchaseLog = await prismaAny.pointPurchaseLog.findFirst({
      where: {
        providerPaymentIntentId: paymentIntentId,
        userId: userId,
      },
      select: {
        id: true,
        status: true,
        paymentSucceededAt: true,
      },
    });

    if (purchaseLog && purchaseLog.status === 'SUCCEEDED') {
      // Webhook処理完了（購入ログが存在し、ステータスがSUCCEEDED）
      return NextResponse.json({
        exists: true,
        purchaseLogId: purchaseLog.id,
        status: purchaseLog.status,
        paymentSucceededAt: purchaseLog.paymentSucceededAt,
      });
    }

    // Webhook処理未完了（購入ログが存在しない、またはステータスがSUCCEEDEDでない）
    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    await logError(error, { route: '/api/points/check-purchase' }, request);
    return NextResponse.json(
      { error: '購入確認の取得に失敗しました' },
      { status: 500 }
    );
  }
}
