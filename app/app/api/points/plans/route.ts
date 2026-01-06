import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 購入可能なポイントプラン一覧（公開）
 * GET /api/points/plans
 */
export async function GET() {
  try {
    const plans = await prisma.pointPurchasePlan.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        points: true,
        price: true,
        label: true,
        isActive: true,
        displayOrder: true,
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("ポイント購入プラン取得エラー:", error);
    return NextResponse.json(
      { error: "ポイント購入プランの取得に失敗しました" },
      { status: 500 }
    );
  }
}


