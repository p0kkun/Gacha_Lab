"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";

// 各タブコンテンツを動的インポート（元のページをそのまま使用）
const GachaTypesContent = dynamic(
  () => import("@/app/admin/gacha-types/page"),
  { ssr: false }
);
const FreeGachaSettingsContent = dynamic(
  () => import("@/app/admin/free-gacha-settings/page"),
  { ssr: false }
);
const ResultMessageTemplatesContent = dynamic(
  () => import("@/app/admin/result-message-templates/page"),
  { ssr: false }
);
const PrizeTiersContent = dynamic(
  () => import("@/app/admin/prize-tiers/page"),
  { ssr: false }
);
const PrizeAssignmentsContent = dynamic(
  () => import("@/app/admin/prize-assignments/page"),
  { ssr: false }
);
const ItemsContent = dynamic(() => import("@/app/admin/items/page"), {
  ssr: false,
});
const SimulatorContent = dynamic(() => import("@/app/admin/simulator/page"), {
  ssr: false,
});

function GachaContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "gacha-types";

  return (
    <TabbedPage
      title="ガチャ管理"
      defaultTab={defaultTab}
      tabs={[
        {
          id: "gacha-types",
          label: "ガチャ設定",
          icon: "🎰",
          content: <GachaTypesContent />,
        },
        {
          id: "free-gacha-settings",
          label: "無料ガチャ設定",
          icon: "🎁",
          content: <FreeGachaSettingsContent />,
        },
        {
          id: "result-message-templates",
          label: "結果メッセージテンプレート",
          icon: "📝",
          content: <ResultMessageTemplatesContent />,
        },
        {
          id: "prize-tiers",
          label: "等級マスタ管理",
          icon: "⭐",
          content: <PrizeTiersContent />,
        },
        {
          id: "prize-assignments",
          label: "景品割当（ガチャ別）",
          icon: "🎁",
          content: <PrizeAssignmentsContent />,
        },
        {
          id: "items",
          label: "アイテム設定",
          icon: "📦",
          content: <ItemsContent />,
        },
        {
          id: "simulator",
          label: "ガチャシミュレータ",
          icon: "🎯",
          content: <SimulatorContent />,
        },
      ]}
    />
  );
}

export default function GachaManagementPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        }
      >
        <GachaContent />
      </Suspense>
    </AdminLayout>
  );
}
