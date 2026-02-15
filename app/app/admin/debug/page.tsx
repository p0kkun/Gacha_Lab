"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import { TargetIcon } from "@/components/admin/icons/AdminIcons";

const SimulatorContent = dynamic(() => import("@/app/admin/simulator/page"), {
  ssr: false,
});

function DebugContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "simulator";

  return (
    <TabbedPage
      title="ガチャシミュレータ"
      defaultTab={defaultTab}
      tabs={[
        {
          id: "simulator",
          label: "ガチャシミュレータ",
          icon: <TargetIcon className="h-4 w-4" />,
          content: <SimulatorContent />,
        },
      ]}
    />
  );
}

export default function DebugPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        }
      >
        <DebugContent />
      </Suspense>
    </AdminLayout>
  );
}
