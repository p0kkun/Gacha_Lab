import { NextRequest, NextResponse } from "next/server";
import { regenerateReferralLink } from "@/lib/referral-management";
import { logError } from "@/lib/error-logger";
import { prisma } from "@/lib/prisma";

/**
 * 紹介リンク再生成API
 * POST /api/referral/regenerate
 *
 * 新しいリンクIDを発行する（既存リンクは無効化しない）。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "ユーザーIDが必要です" }, { status: 400 });
    }

    // データベース接続を確認（generateと揃える）
    try {
      await prisma.$connect();
    } catch (dbError) {
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);
      await logError(
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        {
          route: "/api/referral/regenerate",
          customData: { userId, errorType: "database_connection" },
        },
        request
      );
      return NextResponse.json(
        {
          error: "データベースに接続できませんでした",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    const result = await regenerateReferralLink(userId, { reason: "user_regenerate" });

    return NextResponse.json({
      success: true,
      referralLinkId: result.referralLinkId,
      referralLink: result.referralLink,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    await logError(error, { route: "/api/referral/regenerate" }, request);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "紹介リンクの再生成に失敗しました",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
