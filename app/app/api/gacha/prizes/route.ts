import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

/**
 * ガチャタイプの景品一覧と確率を取得（ユーザー向け）
 * GET /api/gacha/prizes?gachaTypeId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gachaTypeCode = searchParams.get('gachaTypeId') || '';

    if (!gachaTypeCode) {
      return NextResponse.json(
        { error: 'gachaTypeId は必須です' },
        { status: 400 }
      );
    }

    // ガチャタイプを取得
    const gachaType = await prisma.gachaType.findFirst({
      where: { code: gachaTypeCode },
      select: { id: true, name: true },
    });

    if (!gachaType) {
      return NextResponse.json(
        { error: 'ガチャタイプが見つかりません' },
        { status: 404 }
      );
    }

    // 等級別の重みを取得（GachaTierWeight）
    const tierWeights = await prisma.gachaTierWeight.findMany({
      where: {
        gachaTypeId: gachaType.id,
        isActive: true,
      },
      include: {
        tier: {
          select: {
            code: true,
            label: true,
            displayOrder: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // 等級別の総重みを計算
    const totalTierWeight = tierWeights.reduce(
      (sum, tw) => sum + (Number.isFinite(tw.weight) ? tw.weight : 0),
      0
    );

    // 各等級の景品割当を取得
    const assignments = await prisma.gachaPrizeAssignment.findMany({
      where: {
        gachaTypeId: gachaType.id,
        isActive: true,
        item: { isActive: true },
      },
      include: {
        tier: {
          select: {
            code: true,
            label: true,
            displayOrder: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            usageType: true,
          },
        },
      },
      orderBy: [
        { tier: { displayOrder: 'asc' } },
        { id: 'asc' },
      ],
    });

    // 等級ごとにグループ化
    const prizesByTier: Record<
      string,
      Array<{
        itemId: number;
        itemName: string;
        itemDescription: string | null;
        itemImageUrl: string | null;
        itemUsageType: string;
        weight: number;
        probability: number;
      }>
    > = {};

    for (const assignment of assignments) {
      const tierCode = assignment.tierCode;
      if (!prizesByTier[tierCode]) {
        prizesByTier[tierCode] = [];
      }

      // 等級内の総重みを計算
      const tierAssignments = assignments.filter((a) => a.tierCode === tierCode);
      const tierTotalWeight = tierAssignments.reduce(
        (sum, a) => sum + (Number.isFinite(a.weight) ? a.weight : 0),
        0
      );

      // 等級の確率
      const tierWeight = tierWeights.find((tw) => tw.tierCode === tierCode)?.weight || 0;
      const tierProbability = totalTierWeight > 0 ? (tierWeight / totalTierWeight) * 100 : 0;

      // 景品の確率（等級確率 × 等級内の重み比率）
      const itemWeight = Number.isFinite(assignment.weight) ? assignment.weight : 0;
      const itemProbabilityInTier = tierTotalWeight > 0 ? (itemWeight / tierTotalWeight) * 100 : 0;
      const itemProbability = (tierProbability * itemProbabilityInTier) / 100;

      prizesByTier[tierCode].push({
        itemId: assignment.itemId || 0,
        itemName: assignment.item?.name || '不明なアイテム',
        itemDescription: assignment.item?.description || null,
        itemImageUrl: assignment.item?.imageUrl || null,
        itemUsageType: assignment.item?.usageType || 'IMAGE',
        weight: itemWeight,
        probability: itemProbability,
      });
    }

    // 等級ごとの情報を構築
    const tierInfo = tierWeights.map((tw) => {
      const tierCode = tw.tierCode;
      const tierWeight = Number.isFinite(tw.weight) ? tw.weight : 0;
      const tierProbability = totalTierWeight > 0 ? (tierWeight / totalTierWeight) * 100 : 0;
      const prizes = prizesByTier[tierCode] || [];

      return {
        tierCode: tw.tier.code,
        tierLabel: tw.tier.label,
        displayOrder: tw.tier.displayOrder,
        tierWeight,
        tierProbability,
        prizes,
      };
    });

    return NextResponse.json({
      gachaTypeId: gachaTypeCode,
      gachaTypeName: gachaType.name,
      totalTierWeight,
      tiers: tierInfo,
    });
  } catch (error) {
    await logError(error, { route: '/api/gacha/prizes' }, request);
    return NextResponse.json(
      { error: '景品一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
