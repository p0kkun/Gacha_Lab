import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * ユーザーを登録または更新
 * POST /api/users/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, displayName, pictureUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーを登録または更新
    const user = await prisma.user.upsert({
      where: { userId },
      update: {
        displayName: displayName || null,
        pictureUrl: pictureUrl || null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        displayName: displayName || null,
        pictureUrl: pictureUrl || null,
      },
    });

    return NextResponse.json({ 
      success: true,
      user: {
        userId: user.userId,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
      },
    });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}

