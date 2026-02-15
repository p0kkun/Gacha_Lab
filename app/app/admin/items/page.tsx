"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import ItemsManagementContent from "@/components/admin/items/ItemsManagementContent";

export default function ItemsPage() {
  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        <ItemsManagementContent />
      </div>
    </AdminLayout>
  );
}

