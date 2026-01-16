import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendGachaResultMessage } from "@/lib/line-messaging";
import { logError } from "@/lib/error-logger";

/**
 * メッセージ送信API（単一）
 * POST /api/messages/send
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageQueueId } = body;

    if (!messageQueueId || typeof messageQueueId !== "number") {
      return NextResponse.json(
        { success: false, error: "messageQueueIdが必要です" },
        { status: 400 }
      );
    }

    // メッセージ管理テーブルからレコード取得
    const messageQueue = await prisma.messageQueue.findUnique({
      where: { id: messageQueueId },
    });

    if (!messageQueue) {
      return NextResponse.json(
        {
          success: false,
          error: "メッセージが見つかりません",
          errorCode: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 既に送信済みの場合はエラー
    if (messageQueue.isSent) {
      return NextResponse.json(
        {
          success: false,
          error: "既に送信済みです",
          errorCode: "ALREADY_SENT",
        },
        { status: 400 }
      );
    }

    // タイプ1（ガチャ結果）の場合のみ処理
    if (messageQueue.type !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: "未対応のメッセージタイプです",
          errorCode: "UNSUPPORTED_TYPE",
        },
        { status: 400 }
      );
    }

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

    if (!sendResult.success) {
      // 送信失敗時はエラーコードを返す（再送信可能にするため、isSentは更新しない）
      return NextResponse.json(
        {
          success: false,
          error: "送信に失敗しました",
          errorCode:
            sendResult.error === "not_following"
              ? "NOT_FOLLOWING"
              : sendResult.error === "rate_limit"
              ? "RATE_LIMIT"
              : "SEND_FAILED",
        },
        { status: 500 }
      );
    }

    // 送信成功時はisSentをtrueに更新
    const updated = await prisma.messageQueue.update({
      where: { id: messageQueueId },
      data: {
        isSent: true,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "メッセージを送信しました",
      sentAt: updated.sentAt?.toISOString(),
    });
  } catch (error) {
    await logError(error, { route: "/api/messages/send" }, request);
    return NextResponse.json(
      {
        success: false,
        error: "メッセージ送信処理でエラーが発生しました",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
