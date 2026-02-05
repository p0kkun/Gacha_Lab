import { NextRequest, NextResponse } from "next/server";
import { generateReferralLink } from "@/lib/referral-management";
import { logError } from "@/lib/error-logger";
import { prisma } from "@/lib/prisma";

/**
 * 紹介リンク生成API
 * POST /api/referral/generate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    // データベース接続を確認
    try {
      await prisma.$connect();
      console.log("[Referral Generate] データベース接続成功");
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      console.error("[Referral Generate] データベース接続エラー:", errorMessage);
      await logError(
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        { route: "/api/referral/generate", customData: { userId, errorType: "database_connection" } },
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

    const result = await generateReferralLink(userId);

    return NextResponse.json({
      success: true,
      referralLinkId: result.referralLinkId,
      referralLink: result.referralLink,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("[Referral Generate] エラー:", {
      error: errorMessage,
      stack: errorStack,
    });
    
    await logError(error, { route: "/api/referral/generate" }, request);
    
    // データベース関連のエラーの場合、より詳細な情報を返す
    if (errorMessage.includes("connect") || errorMessage.includes("connection") || errorMessage.includes("timeout")) {
      return NextResponse.json(
        { 
          error: "データベース接続に失敗しました",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "紹介リンクの生成に失敗しました",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  } finally {
    // 接続を明示的に閉じない（Prismaが自動管理）
    // await prisma.$disconnect();
  }
}
