"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";
import AdminIcon from "@/components/icons/AdminIcon";

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
          icon: <AdminIcon name="gacha" className="h-5 w-5" title="ガチャ統計" />,
          content: <GachaStatisticsContent />,
        },
        {
          id: "items",
          label: "アイテム統計",
          icon: <AdminIcon name="box" className="h-5 w-5" title="アイテム統計" />,
          content: <ItemStatisticsContent />,
        },
        {
          id: "purchase-history",
          label: "購入履歴",
          icon: <AdminIcon name="point" className="h-5 w-5" title="購入履歴" />,
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
