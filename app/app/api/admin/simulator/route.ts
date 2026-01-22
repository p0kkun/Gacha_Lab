import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

// アプリ側と同じ抽選ロジック
function drawByWeights<T extends { weight: number }>(rows: T[]): T {
  const total = rows.reduce(
    (sum, r) => sum + (Number.isFinite(r.weight) ? r.weight : 0),
    0
  );
  if (total <= 0) return rows[Math.floor(Math.random() * rows.length)];
  const rnd = Math.random() * total;
  let acc = 0;
  for (const row of rows) {
    acc += row.weight;
    if (rnd < acc) return row;
  }
  return rows[rows.length - 1];
}

/**
 * ガチャシミュレータを実行
 * POST /api/admin/simulator
 * アプリ側と同じ2段階抽選ロジック（等級抽選→アイテム抽選）
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
    const tierWeights = await (prisma as any).gachaTierWeight.findMany({
      where: { gachaTypeId: gachaTypeInternalId, isActive: true },
      select: { tierCode: true, weight: true },
      orderBy: [{ tierCode: 'asc' }],
    });

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
    if (totalTierWeight <= 0) {
      return NextResponse.json(
        { error: '重みの合計が0です。確率を設定してください。' },
        { status: 400 }
      );
    }

    // ステップ2: 各等級の景品割当を取得（アイテム抽選用）
    const tierAssignments: Record<string, Array<{ itemId: number; itemName: string; weight: number }>> = {};
    const tierCodes = tierWeights.map((r: any) => r.tierCode);
    
    for (const tierCode of tierCodes) {
      const assignments = await (prisma as any).gachaPrizeAssignment.findMany({
        where: {
          gachaTypeId: gachaTypeInternalId,
          tierCode: tierCode,
          isActive: true,
          item: { isActive: true },
        },
        select: {
          weight: true,
          item: {
            select: { id: true, name: true },
          },
        },
      });

      if (assignments.length > 0) {
        tierAssignments[tierCode] = assignments.map((a: any) => ({
          itemId: a.item.id,
          itemName: a.item.name,
          weight: Number.isFinite(a.weight) ? a.weight : 1,
        }));
      }
    }

    // ステップ3: シミュレーション実行（アプリ側と同じ2段階抽選）
    const tierResults: Record<string, number> = {};
    const itemResults: Record<string, number> = {}; // key: "tierCode:itemId"
    const itemDetails: Record<string, { tierCode: string; itemName: string }> = {}; // key: "tierCode:itemId"

    for (let i = 0; i < iterations; i++) {
      // 第1段階: 等級抽選（アプリ側と同じロジック）
      const selectedTier = drawByWeights(
        tierWeights.map((r: any) => ({
          tierCode: r.tierCode,
          weight: Number.isFinite(r.weight) ? r.weight : 0,
        }))
      );
      const selectedTierCode = selectedTier.tierCode;
      tierResults[selectedTierCode] = (tierResults[selectedTierCode] || 0) + 1;

      // 第2段階: アイテム抽選（アプリ側と同じロジック）
      if (includeItems && tierAssignments[selectedTierCode]) {
        const assignments = tierAssignments[selectedTierCode];
        const selectedItem = drawByWeights(assignments);
        const itemKey = `${selectedTierCode}:${selectedItem.itemId}`;
        itemResults[itemKey] = (itemResults[itemKey] || 0) + 1;
        if (!itemDetails[itemKey]) {
          itemDetails[itemKey] = {
            tierCode: selectedTierCode,
            itemName: selectedItem.itemName,
          };
        }
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
        ((Number.isFinite(r.weight) ? r.weight : 0) / totalTierWeight) * 100;
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
          (sum: number, a: any) => sum + (Number.isFinite(a.weight) ? a.weight : 0),
          0
        );

        for (const assignment of assignments) {
          const itemKey = `${tierCode}:${assignment.itemId}`;
          const itemProb = totalItemWeight > 0
            ? (Number.isFinite(assignment.weight) ? assignment.weight : 0) / totalItemWeight
            : 0;
          const combinedProb = tierProb * itemProb;
          const actualCount = itemResults[itemKey] || 0;
          const actualRate = (actualCount / iterations) * 100;

          itemProbabilities.push({
            tierCode,
            itemId: assignment.itemId,
            itemName: assignment.itemName,
            tierProbability: tierProb * 100,
            itemWeight: assignment.weight,
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






