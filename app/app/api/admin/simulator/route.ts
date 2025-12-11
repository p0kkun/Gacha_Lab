import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ガチャシミュレータを実行
 * POST /api/admin/simulator
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
    const { gachaTypeId, iterations = 10000 } = body;

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: 'ガチャタイプIDが必要です' },
        { status: 400 }
      );
    }

    // ガチャタイプを取得
    const gachaType = await prisma.gachaType.findUnique({
      where: { id: gachaTypeId },
    });

    if (!gachaType) {
      return NextResponse.json(
        { error: 'ガチャタイプが見つかりません' },
        { status: 404 }
      );
    }

    // 重みの合計を計算
    const totalWeight =
      gachaType.firstPrizeWeight +
      gachaType.secondPrizeWeight +
      gachaType.thirdPrizeWeight +
      gachaType.fourthPrizeWeight +
      gachaType.fifthPrizeWeight +
      gachaType.loserWeight;

    if (totalWeight === 0) {
      return NextResponse.json(
        { error: '重みの合計が0です。確率を設定してください。' },
        { status: 400 }
      );
    }

    // シミュレーション実行
    const results = {
      FIRST_PRIZE: 0,
      SECOND_PRIZE: 0,
      THIRD_PRIZE: 0,
      FOURTH_PRIZE: 0,
      FIFTH_PRIZE: 0,
      LOSER: 0,
    };

    for (let i = 0; i < iterations; i++) {
      const random = Math.random() * totalWeight;
      let cumulative = 0;

      cumulative += gachaType.firstPrizeWeight;
      if (random < cumulative) {
        results.FIRST_PRIZE++;
        continue;
      }

      cumulative += gachaType.secondPrizeWeight;
      if (random < cumulative) {
        results.SECOND_PRIZE++;
        continue;
      }

      cumulative += gachaType.thirdPrizeWeight;
      if (random < cumulative) {
        results.THIRD_PRIZE++;
        continue;
      }

      cumulative += gachaType.fourthPrizeWeight;
      if (random < cumulative) {
        results.FOURTH_PRIZE++;
        continue;
      }

      cumulative += gachaType.fifthPrizeWeight;
      if (random < cumulative) {
        results.FIFTH_PRIZE++;
        continue;
      }

      results.LOSER++;
    }

    // 実際の排出率を計算
    const actualRates = {
      FIRST_PRIZE: (results.FIRST_PRIZE / iterations) * 100,
      SECOND_PRIZE: (results.SECOND_PRIZE / iterations) * 100,
      THIRD_PRIZE: (results.THIRD_PRIZE / iterations) * 100,
      FOURTH_PRIZE: (results.FOURTH_PRIZE / iterations) * 100,
      FIFTH_PRIZE: (results.FIFTH_PRIZE / iterations) * 100,
      LOSER: (results.LOSER / iterations) * 100,
    };

    // 設定確率
    const expectedRates = {
      FIRST_PRIZE: (gachaType.firstPrizeWeight / totalWeight) * 100,
      SECOND_PRIZE: (gachaType.secondPrizeWeight / totalWeight) * 100,
      THIRD_PRIZE: (gachaType.thirdPrizeWeight / totalWeight) * 100,
      FOURTH_PRIZE: (gachaType.fourthPrizeWeight / totalWeight) * 100,
      FIFTH_PRIZE: (gachaType.fifthPrizeWeight / totalWeight) * 100,
      LOSER: (gachaType.loserWeight / totalWeight) * 100,
    };

    return NextResponse.json({
      gachaTypeId,
      gachaTypeName: gachaType.name,
      iterations,
      totalWeight,
      results,
      actualRates,
      expectedRates,
    });
  } catch (error) {
    console.error('シミュレータ実行エラー:', error);
    return NextResponse.json(
      { error: 'シミュレータの実行に失敗しました' },
      { status: 500 }
    );
  }
}


