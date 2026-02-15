"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";
import {
  GachaIcon,
  StarIcon,
} from "@/components/admin/icons/AdminIcons";

// 各タブコンテンツを動的インポート（元のページをそのまま使用）
const GachaTypesContent = dynamic(
  () => import("@/app/admin/gacha-types/page"),
  { ssr: false }
);
const PickupSettingsContent = dynamic(
  () => import("@/app/admin/system/pickup-settings"),
  { ssr: false }
);

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
          label: "一覧",
          icon: <GachaIcon className="h-4 w-4" />,
          content: <GachaTypesContent />,
        },
        {
          id: "pickup",
          label: "ピックアップ設定",
          icon: <StarIcon className="h-4 w-4" />,
          content: <PickupSettingsContent />,
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
