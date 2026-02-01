"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";

// 各タブコンテンツを動的インポート
const GachaStatisticsContent = dynamic(
  () => import("@/app/admin/statistics/gacha-content"),
  { ssr: false }
);
const ItemStatisticsContent = dynamic(
  () => import("@/app/admin/statistics/item-content"),
  { ssr: false }
);
const PurchaseHistoryContent = dynamic(
  () => import("@/app/admin/statistics/purchase-history-content"),
  { ssr: false }
);

function StatisticsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "gacha";

  return (
    <TabbedPage
      title="統計"
      defaultTab={defaultTab}
      tabs={[
        {
          id: "gacha",
          label: "ガチャ統計",
          icon: "🎰",
          content: <GachaStatisticsContent />,
        },
        {
          id: "items",
          label: "アイテム統計",
          icon: "📦",
          content: <ItemStatisticsContent />,
        },
        {
          id: "purchase-history",
          label: "購入履歴",
          icon: "💰",
          content: <PurchaseHistoryContent />,
        },
      ]}
    />
  );
}

export default function StatisticsPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        }
      >
        <StatisticsContent />
      </Suspense>
    </AdminLayout>
  );
}
