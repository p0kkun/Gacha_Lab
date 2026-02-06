import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { sendMessage } from '@/lib/line-messaging';
import { recordMessageSendAction } from '@/lib/admin-action-history';

/**
 * タグ条件でユーザーをフィルタリングしてメッセージを一括送信
 * POST /api/admin/messages/send
 */
export async function POST(request: NextRequest) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { message, tagIds, userIds } = body;

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true },
    });

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'メッセージ内容が必要です' },
        { status: 400 }
      );
    }

    // 送信対象ユーザーを取得
    let targetUserIds: string[] = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // 特定ユーザーを指定
      targetUserIds = userIds;
    } else if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      // タグでフィルタリング
      const userTags = await prisma.userTag.findMany({
        where: {
          tagId: {
            in: tagIds.map((id: string) => parseInt(id)),
          },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'], // 重複を除去
      });

      targetUserIds = userTags.map((ut) => ut.userId);
    } else {
      return NextResponse.json(
        { error: '送信対象（タグまたはユーザー）を指定してください' },
        { status: 400 }
      );
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: '送信対象のユーザーが見つかりません' },
        { status: 400 }
      );
    }

    // 各ユーザーにメッセージを送信
    const results = {
      total: targetUserIds.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    // 並列送信（レート制限に注意）
    // レート制限を考慮して、少しずつ送信する
    const BATCH_SIZE = 10; // 一度に送信するユーザー数
    const DELAY_MS = 100; // バッチ間の遅延（ミリ秒）

    for (let i = 0; i < targetUserIds.length; i += BATCH_SIZE) {
      const batch = targetUserIds.slice(i, i + BATCH_SIZE);
      
      const sendPromises = batch.map(async (userId) => {
        try {
          const result = await sendMessage(userId, message);
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              userId: userId.substring(0, 10) + '...',
              error: result.error || '送信失敗',
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            userId: userId.substring(0, 10) + '...',
            error: error.message || '送信失敗',
          });
          console.error(`メッセージ送信エラー (${userId}):`, error);
        }
      });

      await Promise.all(sendPromises);

      // 最後のバッチでない場合は遅延
      if (i + BATCH_SIZE < targetUserIds.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // 操作履歴を記録（送信成功したユーザーに対して）
    if (results.success > 0) {
      const adminUserId = adminUser?.id ?? authContext.adminUserId;
      const adminName = adminUser?.name ?? 'unknown';
      await recordMessageSendAction({
        adminUserId: String(adminUserId),
        adminName,
        targetUserIds: targetUserIds,
        message: message.trim(),
        tagIds: tagIds || [],
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('メッセージ一括送信エラー:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}

