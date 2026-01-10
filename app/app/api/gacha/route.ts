import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateRandomCard,
  evaluateHand,
  getHandName,
  type Card,
  type HandRank as PokerHandRank,
} from "@/lib/pokerHand";
import { Prisma } from "@prisma/client";

// PointTransactionTypeの一時的な回避策（Prismaクライアントの型解決問題のため）
const PointTransactionType = {
  PURCHASE: "PURCHASE" as const,
  CONSUME: "CONSUME" as const,
  GRANT: "GRANT" as const,
  REFUND: "REFUND" as const,
} as const;
import { sendGachaResultMessage } from "@/lib/line-messaging";

type TierWeightRow = { tierCode: string; weight: number };
type PrizeItemRow = {
  id: number;
  name: string;
  isActive: boolean;
};
type AssignmentRow = { weight: number; item: PrizeItemRow };

type PrismaClientForTiers = {
  gachaTierWeight: {
    findMany(args: {
      where: { gachaTypeId: number; isActive: boolean };
      select: { tierCode: true; weight: true };
    }): Promise<TierWeightRow[]>;
  };
  gachaPrizeAssignment: {
    findMany(args: {
      where: {
        gachaTypeId: number;
        tierCode: string;
        isActive: boolean;
        item: { isActive: boolean };
      };
      select: {
        weight: true;
        item: {
          select: { id: true; name: true; isActive: true };
        };
      };
    }): Promise<AssignmentRow[]>;
  };
};

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

// NOTE: 旧ロジック（GachaTypeの固定カラム/JSON）による抽選は廃止。
// 正は GachaTierWeight（等級×重み）テーブル。

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gachaTypeId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: "ガチャタイプIDが必要です" },
        { status: 400 }
      );
    }

    // NOTE: 外部からは code（例: "normal"）を受け取る。変数名は互換のため gachaTypeId のまま。
    const gachaTypeCode = String(gachaTypeId);

    // ガチャタイプの設定を取得
    // NOTE: Prisma Client未再生成の状態でもビルドが通るように findFirst + any で回避。
    // 新DB構築後に `prisma generate` を実行すれば `findUnique({ where: { code } })` に戻せます。
    const gachaType = await prisma.gachaType.findFirst({
      where: { code: gachaTypeCode } as unknown as Prisma.GachaTypeWhereInput,
    });

    if (!gachaType || !gachaType.isActive) {
      return NextResponse.json(
        { error: "ガチャタイプが見つからないか、無効です" },
        { status: 404 }
      );
    }

    // 動画設定のバリデーション（個別設定の場合のみ）
    // デフォルト設定を使用する場合は、動画選択ロジック側で処理されるため、ここではバリデーションしない
    if (gachaType.useDefaultVideos === false) {
      const gachaTypeForVideos = gachaType as unknown as {
        commonVideoAssetIds?: number[];
        tierVideoAssetIds?: unknown;
      };
      const commonVideoIds = gachaTypeForVideos.commonVideoAssetIds || [];
      const rarityVideoIds = gachaTypeForVideos.tierVideoAssetIds
        ? typeof gachaTypeForVideos.tierVideoAssetIds === "string"
          ? JSON.parse(gachaTypeForVideos.tierVideoAssetIds)
          : gachaTypeForVideos.tierVideoAssetIds
        : {};

      // 共通動画が設定されていない場合
      if (commonVideoIds.length === 0) {
        return NextResponse.json(
          { error: "このガチャタイプには共通動画が設定されていません" },
          { status: 400 }
        );
      }

      // 各レアリティの動画が設定されているか確認（あたりの場合のみ）
      const requiredRarities = [
        "FIRST_PRIZE",
        "SECOND_PRIZE",
        "THIRD_PRIZE",
        "FOURTH_PRIZE",
        "FIFTH_PRIZE",
      ];
      const missingRarities: string[] = [];
      for (const rarity of requiredRarities) {
        const rarityVideos =
          (rarityVideoIds as Record<string, number[]>)[rarity] || [];
        if (rarityVideos.length === 0) {
          missingRarities.push(rarity);
        }
      }

      if (missingRarities.length > 0) {
        return NextResponse.json(
          {
            error: `このガチャタイプには以下のレアリティの動画が設定されていません: ${missingRarities.join(
              "、"
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // 期間チェック
    const now = new Date();
    // 型アサーション: PrismaスキーマにはstartAt/endAt/pointCostが存在するが、型解決の問題で型エラーが出る場合がある
    const gachaTypeWithDates = gachaType as typeof gachaType & {
      startAt: Date | null;
      endAt: Date | null;
      pointCost: number;
    };

    if (gachaTypeWithDates.startAt && now < gachaTypeWithDates.startAt) {
      return NextResponse.json(
        { error: "このガチャはまだ開始されていません" },
        { status: 403 }
      );
    }
    if (gachaTypeWithDates.endAt && now > gachaTypeWithDates.endAt) {
      return NextResponse.json(
        { error: "このガチャは終了しました" },
        { status: 403 }
      );
    }

    // ポイントチェック
    const pointCost = gachaTypeWithDates.pointCost || 0;
    if (pointCost > 0) {
      const { getPointBalances } = await import("@/lib/point-management");
      const balances = await getPointBalances(userId);

      if (balances.total < pointCost) {
        return NextResponse.json(
          {
            error: `ポイントが不足しています。必要: ${pointCost}ポイント、所持: ${balances.total}ポイント（有償: ${balances.paid}、無償: ${balances.free}）`,
          },
          { status: 403 }
        );
      }
    }

    // 統一された重みベースの抽選ロジック（動的等級設定に対応）
    let selectedTierCode: string;

    // ESLint/TSサーバーの型キャッシュ差異を避けるため、必要なdelegateのみを明示型で参照
    const prismaForTiers = prisma as unknown as PrismaClientForTiers;

    // まず等級マスタと、ガチャ別の確率テーブルを確認（これが正）
    const gachaTypeInternalId = (gachaType as unknown as { id: number }).id;

    const tierWeights = await prismaForTiers.gachaTierWeight.findMany({
      where: { gachaTypeId: gachaTypeInternalId, isActive: true },
      select: { tierCode: true, weight: true },
    });
    if (tierWeights.length > 0) {
      selectedTierCode = drawByWeights(
        tierWeights.map((t: TierWeightRow) => ({
          tierCode: t.tierCode,
          weight:
            typeof t.weight === "number" && Number.isFinite(t.weight)
              ? t.weight
              : 0,
        }))
      ).tierCode;
    } else {
      return NextResponse.json(
        {
          error:
            "ガチャの確率（等級×重み）が未設定です（管理画面で設定してください）",
        },
        { status: 400 }
      );
    }

    // ポーカーハンドは結果表示用のみ（抽選には影響しない）
    // 役が設定されている場合のみ生成
    let pokerHand: {
      hand: PokerHandRank;
      handName: string;
      holeCards: Card[];
      communityCards: Card[];
      allCards: Card[];
    } | null = null;

    // 役が設定されているか確認
    const prizeHands = gachaType.prizeHands
      ? typeof gachaType.prizeHands === "string"
        ? JSON.parse(gachaType.prizeHands)
        : gachaType.prizeHands
      : null;

    // 既存のフィールドからも確認（後方互換性）
    const hasHandsConfigured = prizeHands
      ? Object.values(prizeHands as Record<string, unknown>).some((hands) => {
          return Array.isArray(hands) && hands.length > 0;
        })
      : gachaType.firstPrizeHands.length > 0 ||
        gachaType.secondPrizeHands.length > 0 ||
        gachaType.thirdPrizeHands.length > 0 ||
        gachaType.fourthPrizeHands.length > 0 ||
        gachaType.fifthPrizeHands.length > 0;

    // 役が設定されている場合のみポーカーハンドを生成
    if (hasHandsConfigured) {
      try {
        const allCards: Card[] = Array.from({ length: 7 }, () =>
          generateRandomCard()
        );
        const holeCards = allCards.slice(0, 2);
        const communityCards = allCards.slice(2, 7);
        const pokerHandRank = evaluateHand(allCards);
        const handName = getHandName(pokerHandRank);

        pokerHand = {
          hand: pokerHandRank,
          handName: handName,
          holeCards: holeCards,
          communityCards: communityCards,
          allCards: allCards,
        };
      } catch (error) {
        // ポーカーハンド生成に失敗しても抽選には影響しない
        console.error("ポーカーハンド生成エラー（結果表示用）:", error);
      }
    }

    // 選択された等級の景品を取得（ガチャタイプ別割当が最優先）
    const assignments = await prismaForTiers.gachaPrizeAssignment.findMany({
      where: {
        gachaTypeId: gachaTypeInternalId,
        tierCode: selectedTierCode,
        isActive: true,
        item: { isActive: true },
      },
      select: {
        weight: true,
        item: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json(
        {
          error:
            "該当する景品が見つかりません（管理画面で景品割当（ガチャ別）を設定してください）",
        },
        { status: 404 }
      );
    }

    const selectedItem = drawByWeights(
      assignments.map((a: AssignmentRow) => ({
        item: a.item,
        weight:
          typeof a.weight === "number" && Number.isFinite(a.weight)
            ? a.weight
            : 1,
      }))
    ).item;

    // ポイント消費とガチャ履歴保存をトランザクションで実行
    const result = await prisma.$transaction(async (tx) => {
      // 当選アイテムの詳細情報を取得（ポイント付与情報を含む）
      const itemDetails = await tx.gachaItem.findUnique({
        where: { id: selectedItem.id },
        select: { grantFreePoints: true },
      });

      // ガチャ履歴を保存（ポイント使用情報を含む）
      const gachaHistory = await tx.gachaHistory.create({
        data: {
          userId: userId,
          gachaTypeId: gachaTypeInternalId,
          itemId: selectedItem.id,
          tierCode: selectedTierCode,
          pointsUsed: pointCost,
        } as unknown as Prisma.GachaHistoryUncheckedCreateInput,
      });

      // ポイント消費（無償ポイントから優先的に消費）
      let newBalance = 0;
      if (pointCost > 0) {
        const nowDate = new Date();
        const unifiedExpiresAt = new Date(nowDate);
        unifiedExpiresAt.setFullYear(unifiedExpiresAt.getFullYear() + 1);

        // 残高行を確実に作成
        const existing = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        if (!existing) {
          await tx.userPointBalance.create({
            data: {
              userId,
              paidAmount: 0,
              freeAmount: 0,
              expiresAt: null,
              lastUpdated: nowDate,
            },
          });
        }

        // 期限切れなら同時に失効（lastUpdatedは上書きしない）
        const before = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        if (
          before &&
          before.paidAmount + before.freeAmount > 0 &&
          before.expiresAt &&
          before.expiresAt <= nowDate
        ) {
          await tx.userPointBalance.update({
            where: { userId },
            data: { paidAmount: 0, freeAmount: 0, expiresAt: null },
          });
        }

        const balance = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        const freeAmount = balance?.freeAmount ?? 0;
        const paidAmount = balance?.paidAmount ?? 0;
        const beforeTotal = freeAmount + paidAmount;

        // 無償ポイントから優先的に消費
        const consumeFromFree = Math.min(freeAmount, pointCost);
        const remaining = pointCost - consumeFromFree;
        const consumeFromPaid = remaining;

        const newFreeAmount = freeAmount - consumeFromFree;
        const newPaidAmount = paidAmount - consumeFromPaid;
        const totalBalances = newFreeAmount + newPaidAmount;

        await tx.userPointBalance.update({
          where: { userId },
          data: {
            freeAmount: newFreeAmount,
            paidAmount: newPaidAmount,
            expiresAt: totalBalances > 0 ? unifiedExpiresAt : null,
            lastUpdated: nowDate,
          },
        });

        // ポイント履歴を記録
        await tx.pointHistory.create({
          data: {
            userId,
            transactionType: PointTransactionType.CONSUME,
            amount: -pointCost,
            balanceBefore: beforeTotal,
            balanceAfter: totalBalances,
            description: `${gachaType.name}ガチャ実行`,
            gachaHistoryId: gachaHistory.id,
          } as unknown as Prisma.PointHistoryUncheckedCreateInput,
        });

        newBalance = totalBalances;
      } else {
        // ポイント不要の場合は残高を取得
        const balance = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        newBalance = (balance?.paidAmount ?? 0) + (balance?.freeAmount ?? 0);
      }

      // アイテムに無償ポイント付与が設定されている場合、ポイントを付与
      const grantPoints = itemDetails?.grantFreePoints ?? 0;
      if (grantPoints > 0) {
        const nowDate = new Date();
        const unifiedExpiresAt = new Date(nowDate);
        unifiedExpiresAt.setFullYear(unifiedExpiresAt.getFullYear() + 1);

        // 残高行を確実に作成
        const existing = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        if (!existing) {
          await tx.userPointBalance.create({
            data: {
              userId,
              paidAmount: 0,
              freeAmount: 0,
              expiresAt: null,
              lastUpdated: nowDate,
            },
          });
        }

        const balanceBeforeGrant = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        const beforeTotal = (balanceBeforeGrant?.paidAmount ?? 0) + (balanceBeforeGrant?.freeAmount ?? 0);

        // 無償ポイントを付与
        const updatedBalance = await tx.userPointBalance.update({
          where: { userId },
          data: {
            freeAmount: { increment: grantPoints },
            expiresAt: unifiedExpiresAt,
            lastUpdated: nowDate,
          },
        });

        const afterTotal = (updatedBalance.paidAmount ?? 0) + (updatedBalance.freeAmount ?? 0);

        // ポイント履歴を記録
        await tx.pointHistory.create({
          data: {
            userId,
            transactionType: PointTransactionType.GRANT,
            amount: grantPoints,
            balanceBefore: beforeTotal,
            balanceAfter: afterTotal,
            description: `ガチャ景品「${selectedItem.name}」による無償ポイント付与`,
            gachaHistoryId: gachaHistory.id,
          } as unknown as Prisma.PointHistoryUncheckedCreateInput,
        });

        newBalance = afterTotal;
      }

      return { gachaHistory, newBalance, grantedPoints: grantPoints };
    });

    // 被紹介者の行動を更新（将来の追加報酬機能用）
    const { updateRefereeActivity } = await import("@/lib/referral-management");
    updateRefereeActivity(userId).catch((error) => {
      console.error("被紹介者行動更新エラー:", error);
    });

    // 動画URLを取得（新しい動画システム、ガチャタイプの設定を使用）
    const { getGachaVideoUrls } = await import("@/lib/gacha-video");
    const videoUrls = await getGachaVideoUrls(gachaTypeCode, selectedTierCode);

    // ガチャ結果をLINEトークに送信（非同期、エラーが発生してもガチャ結果は返す）
    // 役が設定されている場合のみポーカーハンド情報を送信
    // メッセージテンプレートはマスタ参照（未設定ならnull）
    let messageTemplate: string | null = null;
    const templateId = (
      gachaType as unknown as { resultMessageTemplateId?: number | null }
    ).resultMessageTemplateId;
    if (
      typeof templateId === "number" &&
      Number.isFinite(templateId) &&
      templateId > 0
    ) {
      // Prisma Client未再生成でも型エラーにしないため、delegateはunknown経由で呼ぶ
      const prismaAny = prisma as unknown as {
        resultMessageTemplate: {
          findFirst: (args: {
            where: { id: number };
          }) => Promise<{ template: string } | null>;
        };
      };
      const t = await prismaAny.resultMessageTemplate.findFirst({
        where: { id: templateId },
      });
      messageTemplate = t?.template ?? null;
    }

    sendGachaResultMessage(
      userId,
      selectedItem.name,
      selectedTierCode,
      gachaType.name,
      messageTemplate,
      pokerHand && pokerHand.handName
        ? {
            handName: pokerHand.handName,
            // 手札とコミュニティカードは送信しない（空配列として送信）
            holeCards: [],
            communityCards: [],
          }
        : undefined,
      result.grantedPoints || 0
    ).catch((error) => {
      // LINEメッセージ送信のエラーはログに記録するが、ガチャ結果には影響しない
      console.error("LINEメッセージ送信エラー（ガチャ結果は正常）:", error);
    });

    return NextResponse.json({
      success: true,
      item: {
        id: selectedItem.id,
        name: selectedItem.name,
        rarity: selectedTierCode, // 後方互換: フロントは従来通り rarity 文字列で受ける
        // 後方互換: 旧クライアントが参照していても壊れないよう先頭動画を返す
        videoUrl: videoUrls[0] || "",
      },
      videoUrls, // 新しい動画システム（VideoAsset設定が正）
      timestamp: new Date().toISOString(),
      pokerHand: pokerHand,
      historyId: result.gachaHistory.id,
      pointsUsed: pointCost,
      pointsRemaining: result.newBalance,
    });
  } catch (error) {
    console.error("ガチャエラー:", error);
    return NextResponse.json(
      { error: "ガチャ抽選に失敗しました" },
      { status: 500 }
    );
  }
}
