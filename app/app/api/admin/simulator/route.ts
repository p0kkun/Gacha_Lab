import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import {
  type AssignmentRow,
  type AssignmentsByTier,
  type PrismaClientForGachaDraw,
  GachaDrawError,
  drawTierAndAssignment,
  getAssignmentsForTier,
  getTierWeights,
  selectTierCode,
} from '@/lib/gacha-draw';

/**
 * ガチャシミュレータを実行
 * POST /api/admin/simulator
 * アプリ側と同じ2段階抽選ロジック（等級抽選→アイテム抽選）
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
    const body = await request.json();
    const { gachaTypeId, iterations = 10000, includeItems = false } = body;

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: 'ガチャタイプIDが必要です' },
        { status: 400 }
      );
    }

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

    const gachaTypeInternalId = gachaType.id;

    // ステップ1: 等級確率テーブル（正）
    const prismaForDraw = prisma as unknown as PrismaClientForGachaDraw;
    const tierWeights = await getTierWeights(prismaForDraw, gachaTypeInternalId);

    if (!Array.isArray(tierWeights) || tierWeights.length === 0) {
      return NextResponse.json(
        { error: '確率（等級×重み）が未設定です。管理画面で設定してください。' },
        { status: 400 }
      );
    }

    const totalTierWeight = tierWeights.reduce(
      (sum: number, r: any) => sum + (Number.isFinite(r.weight) ? r.weight : 0),
      0
    );

    // ステップ2: 各等級の景品割当を取得（2段階抽選用）
    const tierAssignments: AssignmentsByTier = {};
    const tierCodes = tierWeights.map((r: any) => r.tierCode);
    
    for (const tierCode of tierCodes) {
      const assignments = await getAssignmentsForTier(
        prismaForDraw,
        gachaTypeInternalId,
        tierCode
      );
      if (assignments.length > 0) tierAssignments[tierCode] = assignments;
    }

    // ステップ3: シミュレーション実行（アプリ側と同じ2段階抽選）
    const tierResults: Record<string, number> = {};
    const itemResults: Record<string, number> = {}; // key: "tierCode:rewardKey"
    const itemDetails: Record<
      string,
      { tierCode: string; itemId: number; itemName: string; weight: number }
    > = {}; // key: "tierCode:rewardKey"

    for (let i = 0; i < iterations; i++) {
      if (includeItems) {
        try {
          const drawResult = await drawTierAndAssignment(
            tierWeights,
            async (tierCode) => tierAssignments[tierCode] || []
          );
          const selectedTierCode = drawResult.tierCode;
          const selected = drawResult.assignment;

          tierResults[selectedTierCode] = (tierResults[selectedTierCode] || 0) + 1;

          const isPointReward = selected.rewardType === 'POINTS';
          const points = Math.trunc(Number.isFinite(selected.points) ? selected.points : 0);
          const itemId = isPointReward
            ? -Math.abs(points || 0)
            : selected.item?.id ?? 0;
          const itemName = isPointReward
            ? `${points.toLocaleString()}ポイント`
            : selected.item?.name || '無効アイテム';
          const itemKey = `${selectedTierCode}:${itemId}:${isPointReward ? 'POINTS' : 'ITEM'}`;
          itemResults[itemKey] = (itemResults[itemKey] || 0) + 1;
          if (!itemDetails[itemKey]) {
            itemDetails[itemKey] = {
              tierCode: selectedTierCode,
              itemId,
              itemName,
              weight: Number.isFinite(selected.weight) ? selected.weight : 1,
            };
          }
        } catch (error) {
          if (error instanceof GachaDrawError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
          }
          throw error;
        }
      } else {
        // 等級抽選のみ（アイテム抽選は行わない）
        const selectedTierCode = selectTierCode(tierWeights);
        tierResults[selectedTierCode] = (tierResults[selectedTierCode] || 0) + 1;
      }
    }

    // ステップ4: 等級の確率計算
    const tierActualRates: Record<string, number> = {};
    const tierExpectedRates: Record<string, number> = {};
    for (const r of tierWeights) {
      const code = r.tierCode;
      const count = tierResults[code] || 0;
      tierActualRates[code] = (count / iterations) * 100;
      tierExpectedRates[code] =
        totalTierWeight > 0
          ? ((Number.isFinite(r.weight) ? r.weight : 0) / totalTierWeight) * 100
          : 0;
    }

    // ステップ5: アイテムの確率計算（等級確率 × アイテム確率）
    const itemProbabilities: Array<{
      tierCode: string;
      itemId: number;
      itemName: string;
      tierProbability: number;
      itemWeight: number;
      itemProbability: number;
      combinedProbability: number;
      actualCount: number;
      actualRate: number;
    }> = [];

    if (includeItems) {
      for (const tierCode of tierCodes) {
        const tierProb = tierExpectedRates[tierCode] / 100;
        const assignments = tierAssignments[tierCode] || [];
        const totalItemWeight = assignments.reduce(
          (sum: number, a: any) =>
            sum + (Number.isFinite(a.weight) ? a.weight : 0),
          0
        );

        for (const assignment of assignments) {
          const isPointReward = assignment.rewardType === 'POINTS';
          const points = Math.trunc(
            Number.isFinite(assignment.points) ? assignment.points : 0
          );
          const itemId = isPointReward
            ? -Math.abs(points || 0)
            : assignment.item?.id ?? 0;
          const itemName = isPointReward
            ? `${points.toLocaleString()}ポイント`
            : assignment.item?.name || '無効アイテム';
          const itemKey = `${tierCode}:${itemId}:${isPointReward ? 'POINTS' : 'ITEM'}`;
          const itemProb = totalItemWeight > 0
            ? (Number.isFinite(assignment.weight) ? assignment.weight : 0) /
              totalItemWeight
            : 0;
          const combinedProb = tierProb * itemProb;
          const actualCount = itemResults[itemKey] || 0;
          const actualRate = (actualCount / iterations) * 100;

          itemProbabilities.push({
            tierCode,
            itemId,
            itemName,
            tierProbability: tierProb * 100,
            itemWeight: Number.isFinite(assignment.weight) ? assignment.weight : 0,
            itemProbability: itemProb * 100,
            combinedProbability: combinedProb * 100,
            actualCount,
            actualRate,
          });
        }
      }

      // 確率の高い順にソート
      itemProbabilities.sort((a, b) => b.combinedProbability - a.combinedProbability);
    }

    // 固定キーは削除し、PrizeTierテーブルから動的に取得した等級のみを使用

    return NextResponse.json({
      gachaTypeId: gachaTypeCode,
      gachaTypeName: gachaType.name,
      iterations,
      totalWeight: totalTierWeight,
      results: tierResults,
      actualRates: tierActualRates,
      expectedRates: tierExpectedRates,
      includeItems,
      itemProbabilities: includeItems ? itemProbabilities : undefined,
    });
  } catch (error) {
    console.error('シミュレータ実行エラー:', error);
    return NextResponse.json(
      { error: 'シミュレータの実行に失敗しました' },
      { status: 500 }
    );
  }
}




