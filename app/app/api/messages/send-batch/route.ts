import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendGachaResultMessage } from "@/lib/line-messaging";
import { logError } from "@/lib/error-logger";

/**
 * メッセージ一括送信API
 * POST /api/messages/send-batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageQueueIds, userId } = body;

    if (!Array.isArray(messageQueueIds) || messageQueueIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "messageQueueIdsが必要です" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "userIdが必要です" },
        { status: 400 }
      );
    }

    // メッセージ管理テーブルからレコード取得（ユーザーIDでフィルタ）
    const messageQueues = await prisma.messageQueue.findMany({
      where: {
        id: { in: messageQueueIds },
        userId: userId, // 認証チェック：ユーザーIDの一致確認
        isSent: false,
        type: 1, // ガチャ結果のみ
      },
    });

    if (messageQueues.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "送信可能なメッセージが見つかりません",
        },
        { status: 404 }
      );
    }

    const results: Array<{
      messageQueueId: number;
      success: boolean;
      error?: string;
    }> = [];

    // 各メッセージを送信
    for (const messageQueue of messageQueues) {
      try {
        // jsonDataから情報を取得
        const jsonData = messageQueue.jsonData as {
          gachaHistoryId: number;
          itemName: string;
          tierCode: string;
          gachaTypeName: string;
          gachaTypeId: number;
          pokerHand?: {
            handName: string;
            holeCards: Array<{ suit: string; rank: string }>;
            communityCards: Array<{ suit: string; rank: string }>;
          };
          grantedPoints: number;
        };

        // メッセージテンプレートを取得
        let messageTemplate: string | null = null;
        if (messageQueue.templateId) {
          const template = await prisma.resultMessageTemplate.findFirst({
            where: { id: messageQueue.templateId },
          });
          messageTemplate = template?.template ?? null;
        }

        // ガチャタイプのiconImageUrlを取得
        const gachaType = await prisma.gachaType.findUnique({
          where: { id: jsonData.gachaTypeId },
          select: { iconImageUrl: true },
        });

        // LINEメッセージを送信
        const sendResult = await sendGachaResultMessage(
          messageQueue.userId,
          jsonData.itemName,
          jsonData.tierCode,
          jsonData.gachaTypeName,
          messageTemplate,
          jsonData.pokerHand,
          jsonData.grantedPoints,
          gachaType?.iconImageUrl || null
        );

        if (sendResult.success) {
          // 送信成功時はisSentをtrueに更新
          await prisma.messageQueue.update({
            where: { id: messageQueue.id },
            data: {
              isSent: true,
              sentAt: new Date(),
            },
          });

          results.push({
            messageQueueId: messageQueue.id,
            success: true,
          });
        } else {
          // 送信失敗時はエラーを記録（再送信可能にするため、isSentは更新しない）
          results.push({
            messageQueueId: messageQueue.id,
            success: false,
            error:
              sendResult.error === "not_following"
                ? "NOT_FOLLOWING"
                : sendResult.error === "rate_limit"
                ? "RATE_LIMIT"
                : "SEND_FAILED",
          });
        }
      } catch (error) {
        // 個別のメッセージ送信エラーは記録するが、処理は続行
        await logError(
          error,
          {
            route: "/api/messages/send-batch",
            userId: messageQueue.userId,
            customData: { messageQueueId: messageQueue.id },
          },
          request
        );

        results.push({
          messageQueueId: messageQueue.id,
          success: false,
          error: "INTERNAL_ERROR",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      succeeded,
      failed,
    });
  } catch (error) {
    await logError(error, { route: "/api/messages/send-batch" }, request);
    return NextResponse.json(
      {
        success: false,
        error: "メッセージ一括送信処理でエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
