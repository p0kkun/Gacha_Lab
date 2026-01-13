import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { grantFreePoints, grantPaidPoints } from '@/lib/point-management';
import { PointTransactionType } from '@prisma/client';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { sendMessage } from '@/lib/line-messaging';
import { recordPointGrantAction } from '@/lib/admin-action-history';

/**
 * ポイント付与API
 * POST /api/admin/points/grant
 */
export async function POST(request: NextRequest) {
  try {
    // 管理者認証
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, amount, pointType, description, sendNotification, notificationMessage, adminUserId, adminName } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーIDの配列が必要です' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'ポイント数は1以上である必要があります' },
        { status: 400 }
      );
    }

    const results = {
      total: userIds.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    // ポイント付与成功したユーザーIDを記録（通知送信用）
    const successfulUserIds: string[] = [];

    // 各ユーザーにポイントを付与
    for (const userId of userIds) {
      try {
        // ユーザーが存在するか確認
        const user = await prisma.user.findUnique({
          where: { userId },
          select: { userId: true },
        });

        if (!user) {
          results.failed++;
          results.errors.push({
            userId,
            error: 'ユーザーが見つかりません',
          });
          continue;
        }

        // ポイント種別に応じて付与
        if (pointType === 'PAID') {
          await grantPaidPoints(
            userId,
            amount,
            null, // 有効期限は自動設定（最終更新日から1年後）
            description || `${amount}ポイント付与（有償）`
          );
        } else {
          await grantFreePoints(
            userId,
            amount,
            null, // 有効期限は自動設定（最終更新日から1年後）
            description || `${amount}ポイント付与（無償）`,
            PointTransactionType.GRANT
          );
        }

        results.success++;
        successfulUserIds.push(userId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message || 'ポイント付与に失敗しました',
        });
        console.error(`ポイント付与エラー (${userId}):`, error);
      }
    }

    // 通知メッセージを送信（オプション）
    let notificationResults = null;
    if (sendNotification && successfulUserIds.length > 0) {
      const defaultMessage = `${amount}ポイント（${pointType === 'PAID' ? '有償' : '無償'}）を付与しました。ガチャをお楽しみください！`;
      const messageText = notificationMessage?.trim() || defaultMessage;

      notificationResults = {
        total: successfulUserIds.length,
        success: 0,
        failed: 0,
      };

      // レート制限を考慮してバッチ送信
      const BATCH_SIZE = 10;
      const DELAY_MS = 100;

      for (let i = 0; i < successfulUserIds.length; i += BATCH_SIZE) {
        const batch = successfulUserIds.slice(i, i + BATCH_SIZE);

        const sendPromises = batch.map(async (userId) => {
          try {
            const result = await sendMessage(userId, messageText);
            if (result.success) {
              notificationResults!.success++;
            } else {
              notificationResults!.failed++;
            }
          } catch (error: any) {
            notificationResults!.failed++;
            console.error(`通知メッセージ送信エラー (${userId}):`, error);
          }
        });

        await Promise.all(sendPromises);

        // 最後のバッチでない場合は遅延
        if (i + BATCH_SIZE < successfulUserIds.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    // 操作履歴を記録（成功したユーザーに対して）
    if (successfulUserIds.length > 0) {
      await recordPointGrantAction({
        adminUserId: adminUserId || 'unknown',
        adminName: adminName || 'unknown',
        targetUserIds: successfulUserIds,
        amount,
        pointType,
        description: description || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        notificationResults,
      },
    });
  } catch (error) {
    console.error('ポイント付与APIエラー:', error);
    return NextResponse.json(
      { error: 'ポイント付与に失敗しました' },
      { status: 500 }
    );
  }
}

