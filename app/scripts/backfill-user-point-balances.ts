import { prisma } from "@/lib/prisma";
import { PointType } from "@prisma/client";

type LegacyRow = {
  userId: string;
  pointType: PointType;
  amount: number;
  expiresAt: Date | null;
  lastUpdated: Date;
};

/**
 * 旧 point_balances（有償/無償で2行）→ user_point_balances（1行）へバックフィル
 *
 * - migration.sqlを手編集しない運用のため、データ移行はスクリプトで実施
 * - 本番では「DROP point_balances」を適用する前に1回だけ実行する
 */
async function main() {
  // 旧テーブルが存在しない環境では何もしない（既にDROP済み等）
  const tableExists = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'point_balances'
    ) as "exists"`;

  if (!tableExists[0]?.exists) {
    console.log("[backfill] point_balances が存在しないためスキップします。");
    return;
  }

  const legacy = await prisma.$queryRaw<LegacyRow[]>`
    SELECT "userId", "pointType", "amount", "expiresAt", "lastUpdated"
    FROM "point_balances"
  `;

  const byUser = new Map<
    string,
    {
      paid: LegacyRow | null;
      free: LegacyRow | null;
    }
  >();

  for (const row of legacy) {
    const entry = byUser.get(row.userId) ?? { paid: null, free: null };
    if (row.pointType === "PAID") entry.paid = row;
    if (row.pointType === "FREE") entry.free = row;
    byUser.set(row.userId, entry);
  }

  let upserted = 0;
  for (const [userId, entry] of byUser.entries()) {
    const paidAmount = entry.paid?.amount ?? 0;
    const freeAmount = entry.free?.amount ?? 0;
    const expiresAt =
      ([entry.paid?.expiresAt ?? null, entry.free?.expiresAt ?? null]
        .filter((d): d is Date => !!d)
        .sort((a, b) => (a > b ? -1 : 1))[0] ?? null);
    const lastUpdated =
      ([entry.paid?.lastUpdated ?? null, entry.free?.lastUpdated ?? null]
        .filter((d): d is Date => !!d)
        .sort((a, b) => (a > b ? -1 : 1))[0] ?? new Date());

    await prisma.userPointBalance.upsert({
      where: { userId },
      create: {
        userId,
        paidAmount,
        freeAmount,
        expiresAt,
        lastUpdated,
      },
      update: {
        paidAmount,
        freeAmount,
        expiresAt,
        lastUpdated,
      },
    });
    upserted++;
  }

  console.log("[backfill] 完了:", {
    users: byUser.size,
    upserted,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[backfill] エラー:", e);
    await prisma.$disconnect();
    process.exit(1);
  });



