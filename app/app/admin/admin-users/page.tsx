"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import AdminUsersContent from "@/components/admin/AdminUsersContent";

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">管理者管理</h1>
        <AdminUsersContent />
      </div>
    </AdminLayout>
  );
}
