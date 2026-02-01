"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";

// 各タブコンテンツを動的インポート（元のページをそのまま使用）
const PointsManagementContent = dynamic(
  () => import("@/app/admin/points/points-management"),
  { ssr: false }
);
const PointPlansContent = dynamic(
  () => import("@/app/admin/point-plans/page"),
  { ssr: false }
);

function PointsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "points";

  return (
    <TabbedPage
      title="ポイント管理"
      defaultTab={defaultTab}
      tabs={[
        {
          id: "points",
          label: "ポイント管理",
          icon: "💰",
          content: <PointsManagementContent />,
        },
        {
          id: "point-plans",
          label: "ポイント購入プラン",
          icon: "💳",
          content: <PointPlansContent />,
        },
      ]}
    />
  );
}

export default function PointsManagementGroupPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        }
      >
        <PointsContent />
      </Suspense>
    </AdminLayout>
  );
}
