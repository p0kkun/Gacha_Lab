// Prisma シードファイル
// 初期データを投入するためのスクリプト

import { PrismaClient, Rarity, HandRank } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

// Load .env.local first, then .env
config({ path: ".env.local" });
config();

// Prisma 7の新しい方式でPrismaClientを初期化
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : undefined;

const adapter = pool ? new PrismaPg(pool) : undefined;

const prisma = new PrismaClient({
  ...(adapter && { adapter }),
});

async function main() {
  console.log("🌱 シードデータの投入を開始します...");

  // 1. ガチャタイプの初期データ
  console.log("📦 ガチャタイプを作成中...");

  await prisma.gachaType.upsert({
    where: { id: "normal" },
    update: {
      // 既存データにもデフォルトの役を設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],
      fourthPrizeHands: [HandRank.FULL_HOUSE],
      fifthPrizeHands: [HandRank.FLUSH],
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 100ポイント）
      pointCost: 100,
    },
    create: {
      id: "normal",
      name: "通常ガチャ",
      description: "通常のガチャです",
      firstPrizeWeight: 1, // 1%
      secondPrizeWeight: 2, // 2%
      thirdPrizeWeight: 5, // 5%
      fourthPrizeWeight: 10, // 10%
      fifthPrizeWeight: 20, // 20%
      loserWeight: 62, // 62%
      // デフォルトの役設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],      // 1等: ロイヤルフラッシュ（最強）
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],  // 2等: ストレートフラッシュ
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],   // 3等: フォーカード
      fourthPrizeHands: [HandRank.FULL_HOUSE],      // 4等: フルハウス
      fifthPrizeHands: [HandRank.FLUSH],            // 5等: フラッシュ
      // ハズレは上位の当たりに設定されていない役すべてが対象
      isActive: true,
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 100ポイント）
      pointCost: 100,
    },
  });

  await prisma.gachaType.upsert({
    where: { id: "premium" },
    update: {
      // 既存データにもデフォルトの役を設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],
      fourthPrizeHands: [HandRank.FULL_HOUSE],
      fifthPrizeHands: [HandRank.FLUSH],
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 300ポイント）
      pointCost: 300,
    },
    create: {
      id: "premium",
      name: "プレミアムガチャ",
      description: "プレミアムガチャです",
      firstPrizeWeight: 3, // 3%
      secondPrizeWeight: 5, // 5%
      thirdPrizeWeight: 10, // 10%
      fourthPrizeWeight: 15, // 15%
      fifthPrizeWeight: 25, // 25%
      loserWeight: 42, // 42%
      // デフォルトの役設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],      // 1等: ロイヤルフラッシュ（最強）
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],  // 2等: ストレートフラッシュ
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],   // 3等: フォーカード
      fourthPrizeHands: [HandRank.FULL_HOUSE],      // 4等: フルハウス
      fifthPrizeHands: [HandRank.FLUSH],            // 5等: フラッシュ
      // ハズレは上位の当たりに設定されていない役すべてが対象
      isActive: true,
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 300ポイント）
      pointCost: 300,
    },
  });

  console.log("✅ ガチャタイプの作成が完了しました");

  // 2. ガチャアイテムの初期データ（サンプル）
  console.log("🎁 ガチャアイテムを作成中...");

  const items = [
    {
      name: "MAIN EVENT 無料 voucher",
      rarity: Rarity.FIRST_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "INVITATION 無料 voucher",
      rarity: Rarity.SECOND_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "5000円 OFF voucher",
      rarity: Rarity.THIRD_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "3000円 OFF voucher",
      rarity: Rarity.FOURTH_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "1000円 OFF voucher",
      rarity: Rarity.FIFTH_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "ハズレ",
      rarity: Rarity.LOSER,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
  ];

  // ガチャアイテムの作成（既存データを保護）
  for (const item of items) {
    // 既存のアイテムを確認
    const existingItem = await prisma.gachaItem.findFirst({
      where: {
        name: item.name,
        rarity: item.rarity,
      },
    });

    if (existingItem) {
      // 既存データがある場合は更新（必要に応じて）
      await prisma.gachaItem.update({
        where: { id: existingItem.id },
        data: {
          videoUrl: item.videoUrl,
          isActive: item.isActive,
        },
      });
    } else {
      // 存在しない場合は作成
      await prisma.gachaItem.create({
        data: {
          name: item.name,
          rarity: item.rarity,
          videoUrl: item.videoUrl,
          isActive: item.isActive,
          gachaTypeId: null, // 共通アイテムとして設定
        },
      });
    }
  }

  console.log("✅ ガチャアイテムの作成が完了しました");
  console.log("🎉 シードデータの投入が完了しました！");
}

main()
  .catch((e) => {
    console.error("❌ シードデータの投入中にエラーが発生しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
