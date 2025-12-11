import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 利用可能なガチャタイプ一覧を取得
 * GET /api/gacha/types
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // 有効で、期間内のガチャタイプを取得
    const gachaTypes = await prisma.gachaType.findMany({
      where: {
        isActive: true,
        OR: [
          { startAt: null },
          { startAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endAt: null },
              { endAt: { gte: now } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        pointCost: true,
        isActive: true,
        startAt: true,
        endAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ gachaTypes });
  } catch (error) {
    console.error('ガチャタイプ一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'ガチャタイプ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

