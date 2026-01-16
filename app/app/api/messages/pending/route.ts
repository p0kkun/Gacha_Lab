import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/error-logger";

/**
 * 未送信メッセージ取得API
 * GET /api/messages/pending?userId=xxx&type=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const typeParam = searchParams.get("type");

    if (!userId) {
      return NextResponse.json(
        { error: "userIdが必要です" },
        { status: 400 }
      );
    }

    const type = typeParam ? parseInt(typeParam, 10) : 1; // デフォルトは1（ガチャ結果）

    if (isNaN(type)) {
      return NextResponse.json(
        { error: "typeは数値である必要があります" },
        { status: 400 }
      );
    }

    // 未送信メッセージを取得
    const pendingMessages = await prisma.messageQueue.findMany({
      where: {
        userId,
        isSent: false,
        type,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        jsonData: true,
      },
    });

    return NextResponse.json({
      count: pendingMessages.length,
      messages: pendingMessages.map((msg) => ({
        id: msg.id,
        type: msg.type,
        createdAt: msg.createdAt.toISOString(),
        jsonData: msg.jsonData,
      })),
    });
  } catch (error) {
    await logError(error, { route: "/api/messages/pending" }, request);
    return NextResponse.json(
      { error: "未送信メッセージ取得処理でエラーが発生しました" },
      { status: 500 }
    );
  }
}
