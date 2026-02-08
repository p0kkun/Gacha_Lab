export type TierWeightRow = { tierCode: string; weight: number };
export type PrizeItemRow = {
  id: number;
  name: string;
  isActive: boolean;
};
export type AssignmentRow = {
  weight: number;
  rewardType: "ITEM" | "POINTS";
  points: number;
  item: PrizeItemRow | null;
};

export type AssignmentsByTier = Record<string, AssignmentRow[]>;

export type PrismaClientForGachaDraw = {
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
      };
      select: {
        weight: true;
        rewardType: true;
        points: true;
        item: {
          select: { id: true; name: true; isActive: true };
        };
      };
    }): Promise<AssignmentRow[]>;
  };
};

const normalizeWeight = (value: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export function drawByWeights<T extends { weight: number }>(rows: T[]): T {
  const total = rows.reduce((sum, r) => sum + normalizeWeight(r.weight), 0);
  if (total <= 0) return rows[Math.floor(Math.random() * rows.length)];
  const rnd = Math.random() * total;
  let acc = 0;
  for (const row of rows) {
    acc += normalizeWeight(row.weight);
    if (rnd < acc) return row;
  }
  return rows[rows.length - 1];
}

export async function getTierWeights(
  prisma: PrismaClientForGachaDraw,
  gachaTypeId: number
): Promise<TierWeightRow[]> {
  return prisma.gachaTierWeight.findMany({
    where: { gachaTypeId, isActive: true },
    select: { tierCode: true, weight: true },
  });
}

export function selectTierCode(tierWeights: TierWeightRow[]): string {
  return drawByWeights(
    tierWeights.map((t) => ({
      tierCode: t.tierCode,
      weight: normalizeWeight(t.weight),
    }))
  ).tierCode;
}

export async function getAssignmentsForTier(
  prisma: PrismaClientForGachaDraw,
  gachaTypeId: number,
  tierCode: string
): Promise<AssignmentRow[]> {
  return prisma.gachaPrizeAssignment.findMany({
    where: {
      gachaTypeId,
      tierCode,
      isActive: true,
    },
    select: {
      weight: true,
      rewardType: true,
      points: true,
      item: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });
}

export function selectAssignment(assignments: AssignmentRow[]): AssignmentRow {
  return drawByWeights(
    assignments.map((a) => ({
      rewardType: a.rewardType === "POINTS" ? "POINTS" : "ITEM",
      points: Number.isFinite(a.points) ? a.points : 0,
      item: a.item,
      weight:
        typeof a.weight === "number" && Number.isFinite(a.weight)
          ? a.weight
      : 1,
    }))
  );
}

export class GachaDrawError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const ERROR_TIER_WEIGHTS_EMPTY =
  "ガチャの確率（等級×重み）が未設定です（管理画面で設定してください）";
const ERROR_ASSIGNMENTS_EMPTY =
  "該当する景品が見つかりません（管理画面で景品割当（ガチャ別）を設定してください）";
const ERROR_ITEM_INVALID = "景品アイテムが無効です（管理画面で確認してください）";

export async function drawTierAndAssignment(
  tierWeights: TierWeightRow[],
  getAssignments: (tierCode: string) => Promise<AssignmentRow[]>
): Promise<{ tierCode: string; assignment: AssignmentRow }> {
  if (!Array.isArray(tierWeights) || tierWeights.length === 0) {
    throw new GachaDrawError(ERROR_TIER_WEIGHTS_EMPTY, 400);
  }

  const tierCode = selectTierCode(tierWeights);
  const assignments = await getAssignments(tierCode);

  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new GachaDrawError(ERROR_ASSIGNMENTS_EMPTY, 404);
  }

  const assignment = selectAssignment(assignments);

  if (
    assignment.rewardType !== "POINTS" &&
    (!assignment.item || !assignment.item.isActive)
  ) {
    throw new GachaDrawError(ERROR_ITEM_INVALID, 404);
  }

  return { tierCode, assignment };
}
