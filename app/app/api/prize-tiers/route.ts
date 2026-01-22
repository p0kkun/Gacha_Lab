import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 等級マスタ一覧取得（ユーザー向け、認証不要）
 * GET /api/prize-tiers
 */
export async function GET(request: NextRequest) {
  try {
    const tiers = await prisma.prizeTier.findMany({
      where: {
        isActive: true, // 有効な等級のみ
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        code: true,
        label: true,
        displayOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('等級マスタ一覧取得エラー:', error);
    return NextResponse.json(
      { error: '等級マスタ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
