"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/ui/Modal";

type AdminRole = {
  id: number;
  name: string;
};

type ExclusionLink = {
  id: number;
  adminRoleId: number;
  link: string;
  createdAt: string;
  role?: AdminRole | null;
};

export default function AdminExclusionLinksContent() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [links, setLinks] = useState<ExclusionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState({ adminRoleId: "", link: "" });
  const [editForm, setEditForm] = useState<{
    id: number;
    link: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, linksRes] = await Promise.all([
        fetch("/api/admin/admin-roles", { credentials: "include" }),
        fetch("/api/admin/admin-exclusion-links", { credentials: "include" }),
      ]);

      if (!rolesRes.ok || !linksRes.ok) {
        throw new Error("データ取得に失敗しました");
      }

      const rolesData = await rolesRes.json();
      const linksData = await linksRes.json();
      setRoles(rolesData.roles ?? []);
      setLinks(linksData.links ?? []);
    } catch (err: any) {
      setError(err.message ?? "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!newLink.adminRoleId || !newLink.link.trim()) {
      setError("ロールとリンクは必須です");
      return;
    }
    const res = await fetch("/api/admin/admin-exclusion-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        adminRoleId: Number(newLink.adminRoleId),
        link: newLink.link,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "作成に失敗しました");
      return;
    }

    setNewLink({ adminRoleId: "", link: "" });
    await loadData();
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    setError(null);
    const res = await fetch(`/api/admin/admin-exclusion-links/${editForm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        link: editForm.link,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "更新に失敗しました");
      return;
    }

    setEditForm(null);
    await loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この非表示リンクを削除しますか？")) return;
    setError(null);
    const res = await fetch(`/api/admin/admin-exclusion-links/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "削除に失敗しました");
      return;
    }

    await loadData();
  };

  return (
    <div className="flex min-h-0 flex-col gap-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">新規作成</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="rounded border px-3 py-2"
            value={newLink.adminRoleId}
            onChange={(e) =>
              setNewLink((prev) => ({ ...prev, adminRoleId: e.target.value }))
            }
          >
            <option value="">ロールを選択</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2"
            placeholder="/admin/users など"
            value={newLink.link}
            onChange={(e) =>
              setNewLink((prev) => ({ ...prev, link: e.target.value }))
            }
          />
        </div>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={handleCreate}
        >
          作成
        </button>
      </div>

      <Modal
        isOpen={!!editForm}
        title="非表示リンク編集"
        onClose={() => setEditForm(null)}
        footer={
          <>
            <button
              className="rounded border px-4 py-2 text-gray-700"
              onClick={() => setEditForm(null)}
            >
              キャンセル
            </button>
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={handleUpdate}
            >
              更新
            </button>
          </>
        }
      >
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="/admin/users など"
          value={editForm?.link ?? ""}
          onChange={(e) =>
            setEditForm((prev) => prev && { ...prev, link: e.target.value })
          }
        />
      </Modal>

      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">一覧</h2>
        {loading ? (
          <div>読み込み中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">ID</th>
                  <th className="p-2">ロール</th>
                  <th className="p-2">リンク</th>
                  <th className="p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b">
                    <td className="p-2">{link.id}</td>
                    <td className="p-2">{link.role?.name ?? "-"}</td>
                    <td className="p-2">{link.link}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditForm({
                              id: link.id,
                              link: link.link,
                            })
                          }
                        >
                          編集
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs text-red-600"
                          onClick={() => handleDelete(link.id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={4}>
                      非表示リンクがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
