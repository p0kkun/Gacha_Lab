import { NextRequest, NextResponse } from "next/server";
import { getActiveReferralLink } from "@/lib/referral-management";
import { logError } from "@/lib/error-logger";

/**
 * 現在有効な紹介リンク取得API
 * GET /api/referral/current?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    const current = await getActiveReferralLink(userId);

    return NextResponse.json({
      referralLinkId: current?.referralLinkId ?? null,
      referralLink: current?.referralLink ?? null,
    });
  } catch (error) {
    await logError(error, { route: "/api/referral/current" }, request);
    return NextResponse.json(
      { error: "紹介リンクの取得に失敗しました" },
      { status: 500 }
    );
  }
}
