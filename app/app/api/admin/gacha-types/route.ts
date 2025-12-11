import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ガチャタイプ一覧を取得
 * GET /api/admin/gacha-types
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const gachaTypes = await prisma.gachaType.findMany({
      orderBy: { createdAt: 'desc' },
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

/**
 * ガチャタイプを作成または更新
 * POST /api/admin/gacha-types
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      isActive,
      firstPrizeWeight,
      secondPrizeWeight,
      thirdPrizeWeight,
      fourthPrizeWeight,
      fifthPrizeWeight,
      loserWeight,
      firstPrizeHands,
      secondPrizeHands,
      thirdPrizeHands,
      fourthPrizeHands,
      fifthPrizeHands,
    } = body;

    // バリデーション
    if (!id || !name) {
      return NextResponse.json(
        { error: 'IDと名前は必須です' },
        { status: 400 }
      );
    }

    // 重みの合計を確認（任意のバリデーション）
    const totalWeight =
      (firstPrizeWeight || 0) +
      (secondPrizeWeight || 0) +
      (thirdPrizeWeight || 0) +
      (fourthPrizeWeight || 0) +
      (fifthPrizeWeight || 0) +
      (loserWeight || 0);

    // ガチャタイプを作成または更新
    const gachaType = await prisma.gachaType.upsert({
      where: { id },
      update: {
        name,
        description: description || null,
        isActive: isActive ?? true,
        firstPrizeWeight: firstPrizeWeight || 0,
        secondPrizeWeight: secondPrizeWeight || 0,
        thirdPrizeWeight: thirdPrizeWeight || 0,
        fourthPrizeWeight: fourthPrizeWeight || 0,
        fifthPrizeWeight: fifthPrizeWeight || 0,
        loserWeight: loserWeight || 0,
        firstPrizeHands: Array.isArray(firstPrizeHands) ? firstPrizeHands : [],
        secondPrizeHands: Array.isArray(secondPrizeHands) ? secondPrizeHands : [],
        thirdPrizeHands: Array.isArray(thirdPrizeHands) ? thirdPrizeHands : [],
        fourthPrizeHands: Array.isArray(fourthPrizeHands) ? fourthPrizeHands : [],
        fifthPrizeHands: Array.isArray(fifthPrizeHands) ? fifthPrizeHands : [],
      },
      create: {
        id,
        name,
        description: description || null,
        isActive: isActive ?? true,
        firstPrizeWeight: firstPrizeWeight || 0,
        secondPrizeWeight: secondPrizeWeight || 0,
        thirdPrizeWeight: thirdPrizeWeight || 0,
        fourthPrizeWeight: fourthPrizeWeight || 0,
        fifthPrizeWeight: fifthPrizeWeight || 0,
        loserWeight: loserWeight || 0,
        firstPrizeHands: Array.isArray(firstPrizeHands) ? firstPrizeHands : [],
        secondPrizeHands: Array.isArray(secondPrizeHands) ? secondPrizeHands : [],
        thirdPrizeHands: Array.isArray(thirdPrizeHands) ? thirdPrizeHands : [],
        fourthPrizeHands: Array.isArray(fourthPrizeHands) ? fourthPrizeHands : [],
        fifthPrizeHands: Array.isArray(fifthPrizeHands) ? fifthPrizeHands : [],
      },
    });

    return NextResponse.json({ gachaType });
  } catch (error) {
    console.error('ガチャタイプ作成/更新エラー:', error);
    return NextResponse.json(
      { error: 'ガチャタイプの作成/更新に失敗しました' },
      { status: 500 }
    );
  }
}


