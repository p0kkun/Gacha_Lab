"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import AdminExclusionLinksContent from "@/components/admin/AdminExclusionLinksContent";

export default function AdminExclusionLinksPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">非表示リンク</h1>
        <AdminExclusionLinksContent />
      </div>
    </AdminLayout>
  );
}
