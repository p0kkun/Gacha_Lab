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
import { logError } from "@/lib/error-logger";
import { deleteCache, getCache, setCache } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache-keys";

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
    // ステップ1: ガチャ実行APIを受信する
    const body = await request.json();
    const { userId, gachaTypeId } = body;

    // ステップ2: バリデーションチェックを行う
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

    // ステップ3: ガチャデータを取得する
    // NOTE: Prisma Client未再生成の状態でもビルドが通るように findFirst + any で回避。
    // 新DB構築後に `prisma generate` を実行すれば `findUnique({ where: { code } })` に戻せます。
    const gachaType = await prisma.gachaType.findFirst({
      where: { code: gachaTypeCode } as unknown as Prisma.GachaTypeWhereInput,
    });

    // ステップ4: ガチャが有効か判定する
    if (!gachaType || !gachaType.isActive) {
      await logError(
        new Error("ガチャタイプが見つからないか、無効です"),
        {
          userId,
          route: "/api/gacha",
          customData: { gachaTypeCode, gachaTypeId: gachaType?.id },
        },
        request
      );
      return NextResponse.json(
        { error: "ガチャタイプが見つからないか、無効です" },
        { status: 404 }
      );
    }

    // ステップ6: 動画設定のバリデーションを行う（個別設定の場合のみ）
    // デフォルト設定を使用する場合は、動画選択ロジック側で処理されるため、ここではバリデーションしない
    if (gachaType.useDefaultVideos === false) {
      const gachaTypeForVideos = gachaType as unknown as {
        // commonVideoAssetIds?: number[]; // 共通動画は使用しないためコメントアウト
        tierVideoAssetIds?: unknown;
      };
      // const commonVideoIds = gachaTypeForVideos.commonVideoAssetIds || []; // 共通動画は使用しないためコメントアウト
      const rarityVideoIds = gachaTypeForVideos.tierVideoAssetIds
        ? typeof gachaTypeForVideos.tierVideoAssetIds === "string"
          ? JSON.parse(gachaTypeForVideos.tierVideoAssetIds)
          : gachaTypeForVideos.tierVideoAssetIds
        : {};

      // 各レアリティの動画が設定されているか確認（あたりの場合のみ、PrizeTierテーブルから動的に取得）
      // LOSERコード以外の等級（あたり）のみをチェック
      const prizeTiers = await prisma.prizeTier.findMany({
        where: { isActive: true, code: { not: "LOSER" } },
        select: { code: true, label: true },
      });

      const missingRarities: string[] = [];
      for (const tier of prizeTiers) {
        const rarityVideos =
          (rarityVideoIds as Record<string, number[]>)[tier.code] || [];
        if (rarityVideos.length === 0) {
          missingRarities.push(tier.label);
        }
      }

      if (missingRarities.length > 0) {
        return NextResponse.json(
          {
            error: `このガチャタイプには以下の等級の動画が設定されていません: ${missingRarities.join(
              "、"
            )}`,
          },
          { status: 400 }
        );
      }

      // 等級別動画が設定されていない場合はエラー（共通動画は使用しないためコメントアウト）
      if (Object.keys(rarityVideoIds).length === 0) {
        return NextResponse.json(
          { error: "このガチャタイプには等級別動画が設定されていません" },
          { status: 400 }
        );
      }
    }

    // ステップ5: ガチャが開催中か判定する
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

    // ステップ7: ユーザーデータを取得する
    // Userデータキャッシュ取得
    const userCacheKey = CacheKeys.user(userId);
    let user = await getCache<{ userId: string }>(userCacheKey);

    if (!user) {
      // LineIDをもとにusersデータ取得
      const dbUser = await prisma.user.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (!dbUser) {
        await logError(
          new Error("ユーザー未登録"),
          { userId, route: "/api/gacha", customData: { gachaTypeCode } },
          request
        );
        return NextResponse.json(
          { error: "ユーザー未登録" },
          { status: 404 }
        );
      }

      // Userデータキャッシュ保存
      user = dbUser;
      await setCache(userCacheKey, user, 300); // TTL: 5分
    }

    const { getPointBalances } = await import("@/lib/point-management");
    const balances = await getPointBalances(userId);

    // ステップ8: 消費ポイントが足りているか判定する
    const pointCost = gachaTypeWithDates.pointCost || 0;
    if (pointCost > 0) {
      if (balances.total < pointCost) {
        return NextResponse.json(
          {
            error: `ポイントが不足しています。必要: ${pointCost}ポイント、所持: ${balances.total}ポイント（有償: ${balances.paid}、無償: ${balances.free}）`,
          },
          { status: 403 }
        );
      }
    }

    // ステップ9: 景品抽選を行う
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

    // ステップ10: 景品抽選結果をもとに演出内容を決定する
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

    const hasHandsConfigured = prizeHands
      ? Object.values(prizeHands as Record<string, unknown>).some((hands) => {
          return Array.isArray(hands) && hands.length > 0;
        })
      : false;

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
          select: { 
            id: true, 
            name: true, 
            isActive: true,
            useStartAt: true,
            useEndAt: true,
          },
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
      // ステップ12: ガチャ履歴を保存（ポイント使用情報を含む）
      const gachaHistory = await tx.gachaHistory.create({
        data: {
          userId: userId,
          gachaTypeId: gachaTypeInternalId,
          itemId: selectedItem.id,
          tierCode: selectedTierCode,
          pointsUsed: pointCost,
        } as unknown as Prisma.GachaHistoryUncheckedCreateInput,
      });

      // ステップ13: ユーザーのアイテム所持情報を保存する
      // UserItemテーブルにcreate（同じアイテムを複数所持できるようにする）
      await tx.userItem.create({
        data: {
          userId: userId,
          itemId: selectedItem.id,
          status: "UNUSED",
        },
      });

      // ステップ14: ポイント消費を行う（pointCost > 0 の場合のみ）
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
            },
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
            historyTable: "gacha_histories",
            historyTableId: gachaHistory.id,
          },
        });

        newBalance = totalBalances;
      } else {
        // ポイント不要の場合は残高を取得
        const balance = await tx.userPointBalance.findUnique({
          where: { userId },
        });
        newBalance = (balance?.paidAmount ?? 0) + (balance?.freeAmount ?? 0);
      }

      // ステップ15: メッセージ管理テーブルにレコード作成
      const templateId = (
        gachaType as unknown as { resultMessageTemplateId?: number | null }
      ).resultMessageTemplateId;
      
      const messageQueue = await tx.messageQueue.create({
        data: {
          userId,
          isSent: false,
          type: 1, // ガチャ結果
          templateId:
            typeof templateId === "number" &&
            Number.isFinite(templateId) &&
            templateId > 0
              ? templateId
              : null,
          jsonData: {
            gachaHistoryId: gachaHistory.id,
            itemName: selectedItem.name,
            tierCode: selectedTierCode,
            gachaTypeName: gachaType.name,
            gachaTypeId: gachaTypeInternalId,
            pokerHand: pokerHand && pokerHand.handName
              ? {
                  handName: pokerHand.handName,
                  holeCards: [],
                  communityCards: [],
                }
              : undefined,
            grantedPoints: 0,
          },
        },
      });

      // ステップ16: DBコミットを行う（トランザクション成功時）
      return { gachaHistory, newBalance, grantedPoints: 0, messageQueue };
    });

    // ガチャ実行完了後、キャッシュを削除
    // ポイント残高キャッシュ（consumePoints内で削除されるが、念のため）
    await deleteCache(CacheKeys.pointBalance(userId));
    // ユーザー統計情報キャッシュ（ガチャ履歴が追加されたので、ガチャ実行情報のみ削除）
    await deleteCache(CacheKeys.userStatsGacha(userId));

    // ステップ10（続き）: 動画URLを取得（新しい動画システム、ガチャタイプの設定を使用）
    const { getGachaVideoUrls } = await import("@/lib/gacha-video");
    const videoUrls = await getGachaVideoUrls(gachaTypeCode, selectedTierCode);

    // ステップ17: 抽選結果を含むレスポンスを返却する
    // メッセージ送信は動画終了後にフロントエンドから実行される

    // 被紹介者行動を更新する（将来の追加報酬機能用）
    const { updateRefereeActivity } = await import("@/lib/referral-management");
    updateRefereeActivity(userId).catch((error) => {
      console.error("被紹介者行動更新エラー:", error);
    });

    return NextResponse.json({
      success: true,
      item: {
        id: selectedItem.id,
        name: selectedItem.name,
        rarity: selectedTierCode, // 後方互換: フロントは従来通り rarity 文字列で受ける
        // 後方互換: 旧クライアントが参照していても壊れないよう先頭動画を返す
        videoUrl: videoUrls[0] || "",
        useStartAt: selectedItem.useStartAt?.toISOString() ?? null,
        useEndAt: selectedItem.useEndAt?.toISOString() ?? null,
      },
      gachaTypeName: gachaType.name, // ガチャ名を追加
      videoUrls, // 新しい動画システム（VideoAsset設定が正）
      timestamp: new Date().toISOString(),
      pokerHand: pokerHand,
      historyId: result.gachaHistory.id,
      messageQueueId: result.messageQueue.id, // メッセージ送信用ID
      pointsUsed: pointCost,
      pointsRemaining: result.newBalance,
    });
  } catch (error) {
    // 共通エラーログ出力（ユーザーID、ルーティング情報などを自動付加）
    await logError(error, { route: "/api/gacha" }, request);
    return NextResponse.json(
      { error: "ガチャ抽選に失敗しました" },
      { status: 500 }
    );
  }
}
