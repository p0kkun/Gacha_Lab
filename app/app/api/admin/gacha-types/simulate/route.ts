import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { Rarity } from '@prisma/client';

/**
 * 動的等級設定に対応した重みベースの抽選（統一ロジック）
 * @param prizeWeights 等級ごとの重み（{"FIRST_PRIZE": 10, "SECOND_PRIZE": 20, ...}）
 * @param prizeOrder 等級の順序（["FIRST_PRIZE", "SECOND_PRIZE", ...]）
 * @returns 抽選されたレアリティ
 */
function drawRarityByDynamicWeights(
  prizeWeights: Record<string, number>,
  prizeOrder: string[]
): Rarity {
  // 順序に従って重みを合計
  const totalWeight = prizeOrder.reduce(
    (sum, rarity) => sum + (prizeWeights[rarity] || 0),
    0
  );

  if (totalWeight === 0) {
    // 確率が設定されていない場合は最後の等級（通常はLOSER）
    return (prizeOrder[prizeOrder.length - 1] as Rarity) || Rarity.LOSER;
  }

  const random = Math.random() * totalWeight;
  let current = 0;

  // 順序に従って抽選
  for (const rarity of prizeOrder) {
    current += prizeWeights[rarity] || 0;
    if (random < current) {
      return rarity as Rarity;
    }
  }

  // フォールバック（通常は到達しない）
  return (prizeOrder[prizeOrder.length - 1] as Rarity) || Rarity.LOSER;
}

/**
 * 確率に基づいてレアリティを抽選（既存の固定フィールド用、後方互換性）
 */
function drawRarityByWeights(weights: {
  firstPrizeWeight: number;
  secondPrizeWeight: number;
  thirdPrizeWeight: number;
  fourthPrizeWeight: number;
  fifthPrizeWeight: number;
  loserWeight: number;
}): Rarity {
  const totalWeight =
    weights.firstPrizeWeight +
    weights.secondPrizeWeight +
    weights.thirdPrizeWeight +
    weights.fourthPrizeWeight +
    weights.fifthPrizeWeight +
    weights.loserWeight;

  if (totalWeight === 0) {
    return Rarity.LOSER;
  }

  const random = Math.random() * totalWeight;
  let current = 0;

  current += weights.firstPrizeWeight;
  if (random < current) return Rarity.FIRST_PRIZE;

  current += weights.secondPrizeWeight;
  if (random < current) return Rarity.SECOND_PRIZE;

  current += weights.thirdPrizeWeight;
  if (random < current) return Rarity.THIRD_PRIZE;

  current += weights.fourthPrizeWeight;
  if (random < current) return Rarity.FOURTH_PRIZE;

  current += weights.fifthPrizeWeight;
  if (random < current) return Rarity.FIFTH_PRIZE;

  return Rarity.LOSER;
}

/**
 * ガチャシミュレーション
 * POST /api/admin/gacha-types/simulate
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
    const { gachaTypeId, count } = body;

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: 'ガチャタイプIDが必要です' },
        { status: 400 }
      );
    }

    const simulationCount = Math.min(Math.max(parseInt(count) || 1000, 1), 100000); // 1〜100,000回まで

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

    // 動的等級設定がある場合はそれを使用、なければ既存のフィールドから生成
    const prizeWeights = gachaType.prizeWeights
      ? (typeof gachaType.prizeWeights === 'string'
          ? JSON.parse(gachaType.prizeWeights)
          : gachaType.prizeWeights)
      : null;

    const prizeOrder = gachaType.prizeOrder
      ? (typeof gachaType.prizeOrder === 'string'
          ? JSON.parse(gachaType.prizeOrder)
          : gachaType.prizeOrder)
      : null;

    // シミュレーション実行
    const results: Record<string, number> = {};
    const totalWeight = prizeWeights && prizeOrder
      ? prizeOrder.reduce((sum: number, rarity: string) => sum + (prizeWeights[rarity] || 0), 0)
      : (gachaType.firstPrizeWeight +
         gachaType.secondPrizeWeight +
         gachaType.thirdPrizeWeight +
         gachaType.fourthPrizeWeight +
         gachaType.fifthPrizeWeight +
         gachaType.loserWeight);

    for (let i = 0; i < simulationCount; i++) {
      let selectedRarity: Rarity;
      
      if (prizeWeights && prizeOrder) {
        selectedRarity = drawRarityByDynamicWeights(prizeWeights, prizeOrder);
      } else {
        selectedRarity = drawRarityByWeights({
          firstPrizeWeight: gachaType.firstPrizeWeight,
          secondPrizeWeight: gachaType.secondPrizeWeight,
          thirdPrizeWeight: gachaType.thirdPrizeWeight,
          fourthPrizeWeight: gachaType.fourthPrizeWeight,
          fifthPrizeWeight: gachaType.fifthPrizeWeight,
          loserWeight: gachaType.loserWeight,
        });
      }

      const rarityKey = selectedRarity as string;
      results[rarityKey] = (results[rarityKey] || 0) + 1;
    }

    // 結果を集計
    const summary = Object.entries(results).map(([rarity, count]) => {
      const expectedWeight = prizeWeights && prizeOrder
        ? (prizeWeights[rarity] || 0)
        : (rarity === 'FIRST_PRIZE' ? gachaType.firstPrizeWeight :
           rarity === 'SECOND_PRIZE' ? gachaType.secondPrizeWeight :
           rarity === 'THIRD_PRIZE' ? gachaType.thirdPrizeWeight :
           rarity === 'FOURTH_PRIZE' ? gachaType.fourthPrizeWeight :
           rarity === 'FIFTH_PRIZE' ? gachaType.fifthPrizeWeight :
           gachaType.loserWeight);

      const expectedRate = totalWeight > 0 ? (expectedWeight / totalWeight) * 100 : 0;
      const actualRate = (count / simulationCount) * 100;

      return {
        rarity,
        count,
        expectedWeight,
        expectedRate: expectedRate.toFixed(2),
        actualRate: actualRate.toFixed(2),
        difference: (actualRate - expectedRate).toFixed(2),
      };
    });

    // 等級の順序に従ってソート
    const order = prizeOrder || ['FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'FOURTH_PRIZE', 'FIFTH_PRIZE', 'LOSER'];
    summary.sort((a, b) => {
      const indexA = order.indexOf(a.rarity);
      const indexB = order.indexOf(b.rarity);
      return indexA - indexB;
    });

    return NextResponse.json({
      success: true,
      gachaTypeId,
      simulationCount,
      totalWeight,
      results: summary,
    });
  } catch (error) {
    console.error('シミュレーションエラー:', error);
    return NextResponse.json(
      { error: 'シミュレーションの実行に失敗しました' },
      { status: 500 }
    );
  }
}




