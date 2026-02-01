import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';
import { getCache, setCache, deleteCache } from '@/lib/cache';
import { CacheKeys } from '@/lib/cache-keys';

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

    // Try②：Userデータキャッシュ取得
    const userCacheKey = CacheKeys.user(userId);
    let cachedUser = await getCache<{ userId: string; displayName: string | null; pictureUrl: string | null }>(userCacheKey);

    // キャッシュがない場合はDBから取得
    if (!cachedUser) {
      const dbUser = await prisma.user.findUnique({
        where: { userId },
        select: { userId: true, displayName: true, pictureUrl: true },
      });

      if (dbUser) {
        cachedUser = dbUser;
        // Userデータキャッシュ保存
        await setCache(userCacheKey, cachedUser, 300); // TTL: 5分
      }
    }

    // キャッシュから取得したデータを使用（存在する場合）
    const existingUser = cachedUser;

    if (existingUser) {
      // 既存ユーザーの更新判定フロー
      // 更新データ有無判定（displayName / pictureUrl）
      const needsUpdate = 
        existingUser.displayName !== (displayName || null) ||
        existingUser.pictureUrl !== (pictureUrl || null);

      if (!needsUpdate) {
        // 更新不要: 成功レスポンス返却（登録済み）
        return NextResponse.json({
          success: true,
          user: {
            userId: existingUser.userId,
            displayName: existingUser.displayName,
            pictureUrl: existingUser.pictureUrl,
          },
        });
      }

      // 更新が必要な場合
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

      // Userデータキャッシュ削除
      await deleteCache(userCacheKey);

      return NextResponse.json({
        success: true,
        user: {
          userId: updatedUser.userId,
          displayName: updatedUser.displayName,
          pictureUrl: updatedUser.pictureUrl,
        },
      });
    }

    // Try③：新規ユーザー登録フロー
    const newUser = await prisma.$transaction(async (tx) => {
      // トランザクション開始
      // usersテーブル新規作成
      const user = await tx.user.create({
        data: {
          userId,
          displayName: displayName || null,
          pictureUrl: pictureUrl || null,
        },
      });

      // UserPointBalanceテーブル新規作成
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

    // 新規登録時はキャッシュに保存（次回アクセス時にキャッシュヒットするように）
    await setCache(userCacheKey, {
      userId: newUser.userId,
      displayName: newUser.displayName,
      pictureUrl: newUser.pictureUrl,
    }, 300); // TTL: 5分

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





