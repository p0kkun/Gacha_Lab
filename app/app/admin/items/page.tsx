"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import ItemsManagementContent from "@/components/admin/items/ItemsManagementContent";

export default function ItemsPage() {
  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">アイテム設定</h1>
          <p className="mt-1 text-sm text-gray-600">
            ガチャ景品として利用するアイテムを管理します
          </p>
        </div>
        <ItemsManagementContent />
      </div>
    </AdminLayout>
  );
}
