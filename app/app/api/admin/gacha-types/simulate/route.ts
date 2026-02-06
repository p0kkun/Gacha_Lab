import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext, verifyAdminAuth } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

/**
 * 動的等級設定に対応した重みベースの抽選（統一ロジック）
 * @param prizeWeights 等級ごとの重み（動的）
 * @param prizeOrder 等級の順序（動的）
 * @returns 抽選されたレアリティ
 */
function drawRarityByDynamicWeights(
  prizeWeights: Record<string, number>,
  prizeOrder: string[]
): string {
  // 順序に従って重みを合計
  const totalWeight = prizeOrder.reduce(
    (sum, rarity) => sum + (prizeWeights[rarity] || 0),
    0
  );

  if (totalWeight === 0) {
    // 確率が設定されていない場合は最後の等級
    return prizeOrder[prizeOrder.length - 1] || '';
  }

  const random = Math.random() * totalWeight;
  let current = 0;

  // 順序に従って抽選
  for (const rarity of prizeOrder) {
    current += prizeWeights[rarity] || 0;
    if (random < current) {
      return rarity as string;
    }
  }

  // フォールバック（通常は到達しない）
  return prizeOrder[prizeOrder.length - 1] || '';
}

/**
 * ガチャシミュレーション
 * POST /api/admin/gacha-types/simulate
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const authContext = await getAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true, email: true },
    });

    const body = await request.json();
    const { gachaTypeId, count } = body;

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: 'ガチャタイプIDが必要です' },
        { status: 400 }
      );
    }

    const simulationCount = Math.min(Math.max(parseInt(count) || 1000, 1), 100000); // 1〜100,000回まで

    // NOTE: 外部からは code（例: "normal"）を受け取る（互換のため変数名は gachaTypeId のまま）
    const gachaTypeCode = String(gachaTypeId);

    // ガチャタイプを取得
    const gachaType = await prisma.gachaType.findUnique({
      where: { code: gachaTypeCode },
    });

    if (!gachaType) {
      return NextResponse.json(
        { error: 'ガチャタイプが見つかりません' },
        { status: 404 }
      );
    }

    // シミュレーション実行
    const results: Record<string, number> = {};

    // 等級確率テーブル（正）を優先
    const tierWeights = await prisma.gachaTierWeight.findMany({
      where: { gachaTypeId: gachaType.id, isActive: true },
      select: { tierCode: true, weight: true },
    });

    if (tierWeights.length === 0) {
      return NextResponse.json(
        { error: '確率（等級×重み）が未設定です' },
        { status: 400 }
      );
    }
    const totalWeight = tierWeights.reduce((sum, r) => sum + (r.weight || 0), 0);

    for (let i = 0; i < simulationCount; i++) {
      let selectedTierCode: string;
      
      if (tierWeights.length > 0) {
        // 重みで抽選（テーブル）
        const rows = tierWeights.map((t) => ({
          tierCode: t.tierCode,
          weight: typeof t.weight === 'number' && Number.isFinite(t.weight) ? t.weight : 0,
        }));
        const total = rows.reduce((s, r) => s + r.weight, 0);
        if (total <= 0) {
          selectedTierCode = rows[rows.length - 1]?.tierCode || '';
        } else {
          const rnd = Math.random() * total;
          let acc = 0;
          selectedTierCode = rows[rows.length - 1]?.tierCode || '';
          for (const r of rows) {
            acc += r.weight;
            if (rnd < acc) {
              selectedTierCode = r.tierCode;
              break;
            }
          }
        }
      } else {
        selectedTierCode = '';
      }

      results[selectedTierCode] = (results[selectedTierCode] || 0) + 1;
    }

    // 結果を集計
    const summary = Object.entries(results).map(([rarity, count]) => {
      const expectedWeight =
        tierWeights.find((t) => t.tierCode === rarity)?.weight || 0;

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
    const order = tierWeights.map((t) => t.tierCode);
    summary.sort((a, b) => {
      const indexA = order.indexOf(a.rarity);
      const indexB = order.indexOf(b.rarity);
      return indexA - indexB;
    });

    await recordAdminAction({
      actionType: AdminActionType.GACHA_SIMULATE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
      description: `ガチャシミュレーションを実行: ${gachaType.code}`,
      metadata: {
        gachaTypeId: gachaType.id,
        gachaTypeCode: gachaType.code,
        simulationCount,
      },
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


