import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      prisma.gachaHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          gachaType: {
            select: {
              id: true,
              name: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              rarity: true,
            },
          },
        },
      }),
      prisma.gachaHistory.count({
        where: { userId },
      }),
    ]);

    return NextResponse.json({
      histories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('ガチャ履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'ガチャ履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}


