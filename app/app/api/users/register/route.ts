import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

/**
 * ユーザーを登録または更新
 * POST /api/users/register
 * 
 * フロー:
 * 1. バリデーション（400エラー、ログ不要）
 * 2. ユーザー存在確認
 * 3. 既存ユーザー: 更新（トランザクション）
 * 4. 新規ユーザー: 登録（トランザクション: ユーザー + UserPointBalance初期化）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, displayName, pictureUrl } = body;

    // Try①：バリデーション
    if (!userId || userId.trim() === '') {
      // バリデーションNG: 400エラー（ログ不要）
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Try②：ユーザー存在確認
    const existingUser = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (existingUser) {
      // 既存ユーザーの更新
      const updatedUser = await prisma.$transaction(async (tx) => {
        // トランザクション開始
        const user = await tx.user.update({
          where: { userId },
          data: {
            displayName: displayName || null,
            pictureUrl: pictureUrl || null,
            updatedAt: new Date(),
          },
        });
        // トランザクション終了（COMMIT）
        return user;
      });

      return NextResponse.json({
        success: true,
        user: {
          userId: updatedUser.userId,
          displayName: updatedUser.displayName,
          pictureUrl: updatedUser.pictureUrl,
        },
      });
    }

    // Try③：新規ユーザー登録
    const newUser = await prisma.$transaction(async (tx) => {
      // トランザクション開始
      // ユーザー情報登録
      const user = await tx.user.create({
        data: {
          userId,
          displayName: displayName || null,
          pictureUrl: pictureUrl || null,
        },
      });

      // ポイント残高初期登録（UserPointBalance: 0, 0）
      await tx.userPointBalance.create({
        data: {
          userId,
          paidAmount: 0,
          freeAmount: 0,
        },
      });

      // トランザクション終了（COMMIT）
      return user;
    });

    return NextResponse.json({
      success: true,
      user: {
        userId: newUser.userId,
        displayName: newUser.displayName,
        pictureUrl: newUser.pictureUrl,
      },
    });
  } catch (error) {
    // Catch：例外処理
    // トランザクション内の場合は自動的にROLLBACKされる
    await logError(error, { route: '/api/users/register' }, request);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}





