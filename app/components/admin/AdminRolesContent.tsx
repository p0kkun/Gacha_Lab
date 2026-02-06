"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/ui/Modal";

type AdminRole = {
  id: number;
  name: string;
  _count?: {
    users: number;
    exclusionLinks: number;
  };
};

export default function AdminRolesContent() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [editRole, setEditRole] = useState<{ id: number; name: string } | null>(
    null
  );

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admin-roles", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("ロール一覧の取得に失敗しました");
      }
      const data = await res.json();
      setRoles(data.roles ?? []);
    } catch (err: any) {
      setError(err.message ?? "ロール一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const handleCreate = async () => {
    setError(null);
    const res = await fetch("/api/admin/admin-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newRoleName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "作成に失敗しました");
      return;
    }
    setNewRoleName("");
    await loadRoles();
  };

  const handleUpdate = async () => {
    if (!editRole) return;
    setError(null);
    const res = await fetch(`/api/admin/admin-roles/${editRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editRole.name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "更新に失敗しました");
      return;
    }
    setEditRole(null);
    await loadRoles();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このロールを削除しますか？")) return;
    setError(null);
    const res = await fetch(`/api/admin/admin-roles/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "削除に失敗しました");
      return;
    }
    await loadRoles();
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
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="ロール名"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={handleCreate}
          >
            作成
          </button>
        </div>
      </div>

      <Modal
        isOpen={!!editRole}
        title="ロール編集"
        onClose={() => setEditRole(null)}
        footer={
          <>
            <button
              className="rounded border px-4 py-2 text-gray-700"
              onClick={() => setEditRole(null)}
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
          value={editRole?.name ?? ""}
          onChange={(e) =>
            setEditRole((prev) =>
              prev ? { ...prev, name: e.target.value } : prev
            )
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
                  <th className="p-2">ロール名</th>
                  <th className="p-2">管理者数</th>
                  <th className="p-2">非表示リンク数</th>
                  <th className="p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b">
                    <td className="p-2">{role.id}</td>
                    <td className="p-2">{role.name}</td>
                    <td className="p-2">{role._count?.users ?? 0}</td>
                    <td className="p-2">{role._count?.exclusionLinks ?? 0}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditRole({ id: role.id, name: role.name })
                          }
                        >
                          編集
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs text-red-600"
                          onClick={() => handleDelete(role.id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={5}>
                      ロールがありません
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
