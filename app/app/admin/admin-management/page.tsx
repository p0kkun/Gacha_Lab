"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import TabbedPage from "@/components/admin/TabbedPage";
import AdminUsersContent from "@/components/admin/AdminUsersContent";
import AdminRolesContent from "@/components/admin/AdminRolesContent";
import AdminExclusionLinksContent from "@/components/admin/AdminExclusionLinksContent";
import AdminIcon from "@/components/icons/AdminIcon";

type AdminMeResponse = {
  exclusionLinks?: string[];
};

const isExcluded = (path: string, exclusionLinks: string[]) => {
  return exclusionLinks.some((pattern) => {
    if (!pattern) return false;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return path === prefix || path.startsWith(`${prefix}/`);
    }
    return path === pattern;
  });
};

function AdminManagementContent() {
  const searchParams = useSearchParams();
  const [exclusionLinks, setExclusionLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const res = await fetch("/api/admin/auth/me", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const data: AdminMeResponse = await res.json();
        setExclusionLinks(data.exclusionLinks ?? []);
      } finally {
        setLoading(false);
      }
    };
    void loadContext();
  }, []);

  const allTabs = useMemo(
    () => [
      {
        id: "admin-users",
        label: "管理者管理",
        icon: <AdminIcon name="shield" className="h-5 w-5" title="管理者管理" />,
        path: "/admin/admin-users",
        content: <AdminUsersContent />,
      },
      {
        id: "admin-roles",
        label: "管理者ロール",
        icon: <AdminIcon name="lock" className="h-5 w-5" title="管理者ロール" />,
        path: "/admin/admin-roles",
        content: <AdminRolesContent />,
      },
      {
        id: "admin-exclusion-links",
        label: "非表示リンク",
        icon: <AdminIcon name="eyeOff" className="h-5 w-5" title="非表示リンク" />,
        path: "/admin/admin-exclusion-links",
        content: <AdminExclusionLinksContent />,
      },
    ],
    []
  );

  const visibleTabs = useMemo(() => {
    return allTabs.filter((tab) => !isExcluded(tab.path, exclusionLinks));
  }, [allTabs, exclusionLinks]);

  const defaultTab = useMemo(() => {
    const requested = searchParams.get("tab");
    if (requested && visibleTabs.some((tab) => tab.id === requested)) {
      return requested;
    }
    return visibleTabs[0]?.id ?? "";
  }, [searchParams, visibleTabs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
        表示できるタブがありません。権限設定をご確認ください。
      </div>
    );
  }

  return (
    <TabbedPage
      title="管理者管理"
      defaultTab={defaultTab}
      tabs={visibleTabs.map(({ id, label, icon, content }) => ({
        id,
        label,
        icon,
        content,
      }))}
    />
  );
}

export default function AdminManagementPage() {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-gray-500">
            読み込み中...
          </div>
        }
      >
        <AdminManagementContent />
      </Suspense>
    </AdminLayout>
  );
}
