"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";
import { StarIcon, GiftIcon, PackageIcon } from "@/components/admin/icons/AdminIcons";

const PrizeTiersContent = dynamic(() => import("@/app/admin/prize-tiers/page"), {
  ssr: false,
});
const PrizeAssignmentsContent = dynamic(
  () => import("@/app/admin/prize-assignments/page"),
  { ssr: false }
);
const ItemsContent = dynamic(() => import("@/app/admin/items/page"), {
  ssr: false,
});

function MasterContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "prize-tiers";

  return (
    <TabbedPage
      title="マスタ管理"
      defaultTab={defaultTab}
      tabs={[
        {
          id: "prize-tiers",
          label: "等級マスタ管理",
          icon: <StarIcon className="h-4 w-4" />,
          content: <PrizeTiersContent />,
        },
        {
          id: "prize-assignments",
          label: "景品割当（ガチャ別）",
          icon: <GiftIcon className="h-4 w-4" />,
          content: <PrizeAssignmentsContent />,
        },
        {
          id: "items",
          label: "アイテム設定",
          icon: <PackageIcon className="h-4 w-4" />,
          content: <ItemsContent />,
        },
      ]}
    />
  );
}

export default function MasterManagementPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        }
      >
        <MasterContent />
      </Suspense>
    </AdminLayout>
  );
}
