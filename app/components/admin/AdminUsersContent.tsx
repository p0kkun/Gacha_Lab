"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/admin/ui/Modal";

type AdminRole = {
  id: number;
  name: string;
};

type AdminUser = {
  id: number;
  email: string;
  name: string;
  roleId: number;
  isActive: boolean;
  lastPasswordChangedAt: string | null;
  createdAt: string;
  role?: AdminRole | null;
};

export default function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState("createdAt_desc");

  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    roleId: "",
    password: "",
    isActive: true,
  });

  const [editForm, setEditForm] = useState<{
    id: number;
    name: string;
    roleId: string;
    isActive: boolean;
    password: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch("/api/admin/admin-roles", { credentials: "include" }),
        fetch("/api/admin/admin-users", { credentials: "include" }),
      ]);

      if (!rolesRes.ok || !usersRes.ok) {
        throw new Error("データ取得に失敗しました");
      }

      const rolesData = await rolesRes.json();
      const usersData = await usersRes.json();
      setRoles(rolesData.roles ?? []);
      setUsers(usersData.users ?? []);
    } catch (err: any) {
      setError(err.message ?? "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = filterText.trim().toLowerCase();
    let result = users.filter((user) => {
      if (keyword) {
        const target = `${user.email} ${user.name}`.toLowerCase();
        if (!target.includes(keyword)) return false;
      }
      if (filterRoleId !== "all" && String(user.roleId) !== filterRoleId) {
        return false;
      }
      if (filterStatus === "active" && !user.isActive) return false;
      if (filterStatus === "inactive" && user.isActive) return false;
      return true;
    });

    const compareByString = (a: string, b: string) => a.localeCompare(b, "ja");
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name_asc":
          return compareByString(a.name, b.name);
        case "name_desc":
          return compareByString(b.name, a.name);
        case "email_asc":
          return compareByString(a.email, b.email);
        case "email_desc":
          return compareByString(b.email, a.email);
        case "createdAt_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "createdAt_desc":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return result;
  }, [users, filterText, filterRoleId, filterStatus, sortKey]);

  const handleCreate = async () => {
    setError(null);
    const res = await fetch("/api/admin/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: createForm.email,
        name: createForm.name,
        roleId: Number(createForm.roleId),
        password: createForm.password,
        isActive: createForm.isActive,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "作成に失敗しました");
      return;
    }

    setCreateForm({
      email: "",
      name: "",
      roleId: "",
      password: "",
      isActive: true,
    });
    await loadData();
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    setError(null);
    const res = await fetch(`/api/admin/admin-users/${editForm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: editForm.name,
        roleId: Number(editForm.roleId),
        isActive: editForm.isActive,
        password: editForm.password || undefined,
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
    if (!confirm("この管理者を削除しますか？")) return;
    setError(null);
    const res = await fetch(`/api/admin/admin-users/${id}`, {
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input
            className="rounded border px-3 py-2"
            placeholder="メールアドレス"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="名前"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <select
            className="rounded border px-3 py-2"
            value={createForm.roleId}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, roleId: e.target.value }))
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
            placeholder="初期パスワード"
            type="password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, password: e.target.value }))
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            有効
          </label>
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
        title="管理者編集"
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="rounded border px-3 py-2"
            placeholder="名前"
            value={editForm?.name ?? ""}
            onChange={(e) =>
              setEditForm((prev) => prev && { ...prev, name: e.target.value })
            }
          />
          <select
            className="rounded border px-3 py-2"
            value={editForm?.roleId ?? ""}
            onChange={(e) =>
              setEditForm((prev) => prev && { ...prev, roleId: e.target.value })
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
            placeholder="新しいパスワード（任意）"
            type="password"
            value={editForm?.password ?? ""}
            onChange={(e) =>
              setEditForm((prev) =>
                prev && { ...prev, password: e.target.value }
              )
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editForm?.isActive ?? true}
              onChange={(e) =>
                setEditForm((prev) =>
                  prev && { ...prev, isActive: e.target.checked }
                )
              }
            />
            有効
          </label>
        </div>
      </Modal>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">一覧</h2>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              className="w-56 rounded border px-3 py-2 text-sm"
              placeholder="検索（メール/名前）"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <select
              className="rounded border px-3 py-2 text-sm"
              value={filterRoleId}
              onChange={(e) => setFilterRoleId(e.target.value)}
            >
              <option value="all">全ロール</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">全状態</option>
              <option value="active">有効のみ</option>
              <option value="inactive">無効のみ</option>
            </select>
            <select
              className="rounded border px-3 py-2 text-sm"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="createdAt_desc">作成日（新しい順）</option>
              <option value="createdAt_asc">作成日（古い順）</option>
              <option value="name_asc">名前（昇順）</option>
              <option value="name_desc">名前（降順）</option>
              <option value="email_asc">メール（昇順）</option>
              <option value="email_desc">メール（降順）</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div>読み込み中...</div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">ID</th>
                  <th className="p-2">メール</th>
                  <th className="p-2">名前</th>
                  <th className="p-2">ロール</th>
                  <th className="p-2">有効</th>
                  <th className="p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">{user.id}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.name}</td>
                    <td className="p-2">{user.role?.name ?? "-"}</td>
                    <td className="p-2">{user.isActive ? "有効" : "無効"}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditForm({
                              id: user.id,
                              name: user.name,
                              roleId: String(user.roleId),
                              isActive: user.isActive,
                              password: "",
                            })
                          }
                        >
                          編集
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs text-red-600"
                          onClick={() => handleDelete(user.id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={6}>
                      管理者がいません
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
