"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import dynamic from "next/dynamic";

// 各タブコンテンツを動的インポート
const MessagesSendContent = dynamic(
  () => import("@/app/admin/messages/messages-send"),
  { ssr: false }
);

function MessagesContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "send";

  return (
    <TabbedPage
      title="メッセージ配信"
      defaultTab={defaultTab}
      tabs={[
        {
          id: "send",
          label: "メッセージ配信",
          icon: "💬",
          content: <MessagesSendContent />,
        },
      ]}
    />
  );
}

export default function MessagesPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        }
      >
        <MessagesContent />
      </Suspense>
    </AdminLayout>
  );
}
