"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/admin/ui";
import ConfirmModal from "@/components/admin/ConfirmModal";

type GachaItem = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  usageType: string;
  isActive: boolean;
  useStartAt: string | null;
  useEndAt: string | null;
  createdAt: string;
};

export default function ItemsManagementContent() {
  const [items, setItems] = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActiveFilter, setIsActiveFilter] = useState<string>("true");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: number | null;
  }>({ isOpen: false, itemId: null });

  useEffect(() => {
    void fetchItems();
  }, [isActiveFilter, nameFilter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isActiveFilter !== "") params.append("isActive", isActiveFilter);
      if (nameFilter.trim() !== "") params.append("name", nameFilter.trim());

      const res = await fetch(`/api/admin/items?${params}`);
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) throw new Error("アイテム一覧の取得に失敗しました");

      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error("アイテム取得エラー:", e);
      setError("アイテム一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (start: string | null, end: string | null): string => {
    const toLabel = (value: string | null) =>
      value ? new Date(value).toLocaleString("ja-JP") : null;

    const startLabel = toLabel(start);
    const endLabel = toLabel(end);

    if (!startLabel && !endLabel) return "期間制限なし";
    if (startLabel && endLabel) return `${startLabel} 〜 ${endLabel}`;
    if (startLabel) return `${startLabel} 〜`;
    return `〜 ${endLabel}`;
  };

  const handleToggleActive = async (item: GachaItem) => {
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) throw new Error("状態変更に失敗しました");
      setSuccess(
        `アイテムを${item.isActive ? "無効化" : "有効化"}しました`
      );
      await fetchItems();
    } catch (e) {
      console.error("状態変更エラー:", e);
      setError("状態変更に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.itemId) return;
    const id = deleteConfirm.itemId;
    setDeleteConfirm({ isOpen: false, itemId: null });
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) throw new Error("削除に失敗しました");
      setSuccess("アイテムを削除しました");
      await fetchItems();
    } catch (e) {
      console.error("削除エラー:", e);
      setError("削除に失敗しました");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
        <div className="text-sm text-gray-600">
          総件数: <span className="font-semibold text-gray-900">{items.length}</span>
        </div>
        <Link
          href="/admin/items/new"
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          新規アイテム作成
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          placeholder="アイテム名で絞り込み（部分一致）"
        />
        <select
          value={isActiveFilter}
          onChange={(e) => setIsActiveFilter(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="">すべて</option>
          <option value="true">有効</option>
          <option value="false">無効</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500">
          アイテムがありません
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <div className="hidden grid-cols-[90px_1.2fr_1fr_1fr_120px_280px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <div>ID</div>
            <div>名前</div>
            <div>使用可能期間</div>
            <div>使用方法</div>
            <div>状態</div>
            <div>操作</div>
          </div>
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[90px_1.2fr_1fr_1fr_120px_280px] lg:items-center lg:gap-3">
                  <div className="text-sm text-gray-700">{item.id}</div>
                  <div className="min-w-0 text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-700">
                    {formatPeriod(item.useStartAt, item.useEndAt)}
                  </div>
                  <div className="text-sm text-gray-700">
                    {item.usageType === "SHOW_TO_STAFF" ? "見せて使用" : "画像"}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        item.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.isActive ? "有効" : "無効"}
                    </span>
                  </div>
                  <div className="flex flex-nowrap items-center gap-2">
                    <Link
                      href={`/admin/items/${item.id}`}
                      className="inline-flex whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      編集
                    </Link>
                    <Button
                      onClick={() => handleToggleActive(item)}
                      variant={item.isActive ? "warning" : "success"}
                      size="sm"
                    >
                      {item.isActive ? "無効化" : "有効化"}
                    </Button>
                    {item.isActive && (
                      <Button
                        onClick={() =>
                          setDeleteConfirm({ isOpen: true, itemId: item.id })
                        }
                        variant="danger"
                        size="sm"
                      >
                        削除
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="アイテム削除"
        message="このアイテムを削除しますか？（削除は論理削除です）"
        confirmText="削除"
        cancelText="キャンセル"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, itemId: null })}
      />
    </div>
  );
}
