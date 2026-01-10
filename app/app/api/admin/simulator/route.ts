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

    // 等級確率テーブル（正）
    const tierWeights = await (prisma as any).gachaTierWeight.findMany({
      where: { gachaTypeId: gachaType.id, isActive: true },
      select: { tierCode: true, weight: true },
      orderBy: [{ tierCode: 'asc' }],
    });

    if (!Array.isArray(tierWeights) || tierWeights.length === 0) {
      return NextResponse.json(
        { error: '確率（等級×重み）が未設定です。管理画面で設定してください。' },
        { status: 400 }
      );
    }

    const totalWeight = tierWeights.reduce(
      (sum: number, r: any) => sum + (Number.isFinite(r.weight) ? r.weight : 0),
      0
    );
    if (totalWeight <= 0) {
      return NextResponse.json(
        { error: '重みの合計が0です。確率を設定してください。' },
        { status: 400 }
      );
    }

    const results: Record<string, number> = {};
    for (let i = 0; i < iterations; i++) {
      const rnd = Math.random() * totalWeight;
      let acc = 0;
      let selected = tierWeights[tierWeights.length - 1]?.tierCode || 'LOSER';
      for (const r of tierWeights) {
        acc += Number.isFinite(r.weight) ? r.weight : 0;
        if (rnd < acc) {
          selected = r.tierCode;
          break;
        }
      }
      results[selected] = (results[selected] || 0) + 1;
    }

    const actualRates: Record<string, number> = {};
    const expectedRates: Record<string, number> = {};
    for (const r of tierWeights) {
      const code = r.tierCode;
      const count = results[code] || 0;
      actualRates[code] = (count / iterations) * 100;
      expectedRates[code] =
        ((Number.isFinite(r.weight) ? r.weight : 0) / totalWeight) * 100;
    }

    // 旧UI互換のため、固定キーも埋める（存在しない等級は0）
    const fixedKeys = ['FIRST_PRIZE','SECOND_PRIZE','THIRD_PRIZE','FOURTH_PRIZE','FIFTH_PRIZE','LOSER'];
    for (const k of fixedKeys) {
      if (results[k] === undefined) results[k] = 0;
      if (actualRates[k] === undefined) actualRates[k] = 0;
      if (expectedRates[k] === undefined) expectedRates[k] = 0;
    }

    return NextResponse.json({
      gachaTypeId: gachaTypeCode,
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






