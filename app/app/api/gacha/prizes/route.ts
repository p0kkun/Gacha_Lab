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
    const now = new Date();
    const gachaType = await prisma.gachaType.findFirst({
      where: { code: gachaTypeCode },
      select: { id: true, name: true, isActive: true, startAt: true, endAt: true },
    });

    if (!gachaType) {
      return NextResponse.json(
        { error: 'ガチャタイプが見つかりません' },
        { status: 404 }
      );
    }

    if (!gachaType.isActive) {
      return NextResponse.json(
        { error: 'このガチャは現在無効です' },
        { status: 403 }
      );
    }

    if (gachaType.startAt && now < gachaType.startAt) {
      return NextResponse.json(
        { error: 'このガチャはまだ開始されていません' },
        { status: 403 }
      );
    }
    if (gachaType.endAt && now > gachaType.endAt) {
      return NextResponse.json(
        { error: 'このガチャは終了しました' },
        { status: 403 }
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
        OR: [{ rewardType: 'POINTS' }, { item: { isActive: true } }],
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
            isActive: true,
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
        rewardType: string;
        points: number;
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

      const rewardType = assignment.rewardType === 'POINTS' ? 'POINTS' : 'ITEM';
      const points = Number.isFinite(assignment.points) ? assignment.points : 0;
      const itemName =
        rewardType === 'POINTS'
          ? `${points.toLocaleString()}ポイント`
          : assignment.item?.name || '不明なアイテム';

      prizesByTier[tierCode].push({
        itemId: rewardType === 'POINTS' ? 0 : assignment.itemId || 0,
        itemName,
        itemDescription:
          rewardType === 'POINTS' ? null : assignment.item?.description || null,
        itemImageUrl:
          rewardType === 'POINTS' ? null : assignment.item?.imageUrl || null,
        itemUsageType:
          rewardType === 'POINTS' ? 'POINTS' : assignment.item?.usageType || 'IMAGE',
        rewardType,
        points,
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
      startAt: gachaType.startAt,
      endAt: gachaType.endAt,
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
