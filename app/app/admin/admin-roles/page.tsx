"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import AdminRolesContent from "@/components/admin/AdminRolesContent";

export default function AdminRolesPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">管理者ロール</h1>
        <AdminRolesContent />
      </div>
    </AdminLayout>
  );
}
