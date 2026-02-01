/**
 * ポイント購入プラン（クライアント/サーバー共通のDTO）
 *
 * NOTE:
 * - Prismaモデル（DB）とは別に、APIレスポンスとして扱いやすい形を定義する
 */
export type PointPlan = {
  id: string;
  points: number;
  bonusFreePoints: number;
  price: number;
  label: string;
  isActive: boolean;
  displayOrder: number;
};


