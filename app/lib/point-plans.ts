/**
 * ポイント購入プラン（サーバー側の正）
 *
 * 重要:
 * - クライアントから送られてきた amount/points を信用しない
 * - サーバー側で planId から金額/ポイントを確定させる
 */
export const POINT_PLANS = [
  { id: "p100", points: 100, price: 100, label: "100ポイント" },
  { id: "p500", points: 500, price: 500, label: "500ポイント" },
  { id: "p1000", points: 1000, price: 1000, label: "1,000ポイント" },
  { id: "p3000", points: 3000, price: 3000, label: "3,000ポイント" },
  { id: "p5000", points: 5000, price: 5000, label: "5,000ポイント" },
  { id: "p10000", points: 10000, price: 10000, label: "10,000ポイント" },
] as const;

export type PointPlan = (typeof POINT_PLANS)[number];
export type PointPlanId = PointPlan["id"];

export function getPointPlanById(planId: string): PointPlan | null {
  return (POINT_PLANS as readonly PointPlan[]).find((p) => p.id === planId) ?? null;
}

export function getPointPlanByLegacyPair(
  amount: unknown,
  points: unknown
): PointPlan | null {
  const amt = typeof amount === "number" ? amount : Number(amount);
  const pts = typeof points === "number" ? points : Number(points);
  if (!Number.isFinite(amt) || !Number.isFinite(pts)) return null;
  return (
    (POINT_PLANS as readonly PointPlan[]).find(
      (p) => p.price === amt && p.points === pts
    ) ?? null
  );
}



