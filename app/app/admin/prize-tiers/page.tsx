"use client";

import { useEffect, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Button, Input, Card, Alert, Badge, PageHeader } from "@/components/admin/ui";

type PrizeTier = {
  id: number;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TierCreatePayload = {
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
};

type TierUpdatePayload = {
  code?: string;
  label?: string;
  displayOrder?: number;
  isActive?: boolean;
};

type ConfirmAction =
  | { type: "create"; payload: TierCreatePayload }
  | { type: "update"; tierId: number; payload: TierUpdatePayload }
  | { type: "toggle"; tierId: number; nextActive: boolean; payload: TierUpdatePayload }
  | { type: "delete"; tierId: number };

export default function PrizeTiersPage() {
  const [tiers, setTiers] = useState<PrizeTier[]>([]);
  const [savedTiers, setSavedTiers] = useState<PrizeTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newTier, setNewTier] = useState<TierCreatePayload>({
    code: "",
    label: "",
    displayOrder: 0,
    isActive: true });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "info";
    changes?: Array<{ label: string; from: string; to: string }>;
    action: ConfirmAction;
  } | null>(null);

  const fetchTiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/prize-tiers", {
        headers: {} });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) throw new Error("等級マスタ一覧の取得に失敗しました");
      const data = await res.json();
      const next = Array.isArray(data.tiers) ? data.tiers : [];
      setTiers(next);
      setSavedTiers(next);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const defaultNextOrder = Math.max(0, ...tiers.map((t) => t.displayOrder)) + 1;

  const createTier = async (payload: TierCreatePayload) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/prize-tiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json" },
        body: JSON.stringify(payload) });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "等級マスタの作成に失敗しました");

      setSuccess("等級マスタを作成しました");
      setNewTier({ code: "", label: "", displayOrder: defaultNextOrder + 1, isActive: true });
      await fetchTiers();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    }
  };

  const updateTier = async (tierId: number, payload: TierUpdatePayload) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/prize-tiers/${tierId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json" },
        body: JSON.stringify(payload) });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "等級マスタの更新に失敗しました");

      setSuccess("等級マスタを更新しました");
      setEditingId(null);
      await fetchTiers();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const deleteTier = async (tierId: number) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/prize-tiers/${tierId}`, {
        method: "DELETE",
        headers: {} });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "等級マスタの削除に失敗しました");

      setSuccess(data.message || "等級マスタを削除しました");
      await fetchTiers();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const buildChanges = (action: ConfirmAction, saved: PrizeTier[]): Array<{ label: string; from: string; to: string }> => {
    if (action.type === "update" || action.type === "toggle") {
      const savedTier = saved.find((t) => t.id === action.tierId);
      if (!savedTier) return [];
      const changes: Array<{ label: string; from: string; to: string }> = [];
      if (action.type === "update") {
        if (action.payload.code !== undefined && action.payload.code !== savedTier.code) {
          changes.push({ label: "等級コード", from: savedTier.code, to: action.payload.code });
        }
        if (action.payload.label !== undefined && action.payload.label !== savedTier.label) {
          changes.push({ label: "表示名", from: savedTier.label, to: action.payload.label });
        }
        if (action.payload.displayOrder !== undefined && action.payload.displayOrder !== savedTier.displayOrder) {
          changes.push({ label: "表示順", from: String(savedTier.displayOrder), to: String(action.payload.displayOrder) });
        }
        if (action.payload.isActive !== undefined && action.payload.isActive !== savedTier.isActive) {
          changes.push({ label: "状態", from: savedTier.isActive ? "有効" : "無効", to: action.payload.isActive ? "有効" : "無効" });
        }
      } else {
        changes.push({ label: "状態", from: savedTier.isActive ? "有効" : "無効", to: action.nextActive ? "有効" : "無効" });
      }
      return changes;
    }
    return [];
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;

    try {
      if (confirmModal.action.type === "create") {
        await createTier(confirmModal.action.payload);
      } else if (confirmModal.action.type === "update") {
        await updateTier(confirmModal.action.tierId, confirmModal.action.payload);
      } else if (confirmModal.action.type === "toggle") {
        await updateTier(confirmModal.action.tierId, { isActive: confirmModal.action.nextActive });
      } else if (confirmModal.action.type === "delete") {
        await deleteTier(confirmModal.action.tierId);
      }
      setConfirmModal(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
        {error && (
          <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-6" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* 新規作成フォーム */}
        <Card title="新規等級追加" className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              label="等級コード（英数字・アンダースコア）"
              value={newTier.code}
              onChange={(e) => setNewTier({ ...newTier, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
              placeholder="例: SPECIAL_PRIZE"
            />
            <Input
              label="表示名"
              value={newTier.label}
              onChange={(e) => setNewTier({ ...newTier, label: e.target.value })}
              placeholder="例: 特別賞"
            />
            <Input
              label="表示順"
              type="number"
              value={newTier.displayOrder.toString()}
              onChange={(e) => setNewTier({ ...newTier, displayOrder: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <div className="flex items-end">
              <Button
                fullWidth
                onClick={() => {
                  if (!newTier.code || !newTier.label) {
                    setError("等級コードと表示名は必須です");
                    return;
                  }
                  setConfirmModal({
                    isOpen: true,
                    title: "等級マスタを作成",
                    message: `以下の等級マスタを作成しますか？\n\n等級コード: ${newTier.code}\n表示名: ${newTier.label}`,
                    confirmText: "作成",
                    variant: "info",
                    action: { type: "create", payload: newTier } });
                }}
              >
                追加
              </Button>
            </div>
          </div>
        </Card>

        {/* 一覧 */}
        <div className="rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    等級コード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    表示名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    表示順
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    状態
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tiers.map((tier) => (
                  <tr key={tier.id} className={!tier.isActive ? "bg-gray-50 opacity-60" : ""}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {tier.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {editingId === tier.id ? (
                        <input
                          type="text"
                          value={tier.code}
                          onChange={(e) => {
                            const updated = tiers.map((t) => (t.id === tier.id ? { ...t, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") } : t));
                            setTiers(updated);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs">{tier.code}</code>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {editingId === tier.id ? (
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => {
                            const updated = tiers.map((t) => (t.id === tier.id ? { ...t, label: e.target.value } : t));
                            setTiers(updated);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        tier.label
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {editingId === tier.id ? (
                        <input
                          type="number"
                          value={tier.displayOrder}
                          onChange={(e) => {
                            const updated = tiers.map((t) => (t.id === tier.id ? { ...t, displayOrder: parseInt(e.target.value) || 0 } : t));
                            setTiers(updated);
                          }}
                          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          min="0"
                        />
                      ) : (
                        tier.displayOrder
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Badge variant={tier.isActive ? "success" : "gray"}>
                        {tier.isActive ? "有効" : "無効"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      {editingId === tier.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              const edited = tiers.find((t) => t.id === tier.id);
                              if (!edited) return;
                              const changes = buildChanges({ type: "update", tierId: tier.id, payload: edited }, savedTiers);
                              if (changes.length === 0) {
                                setEditingId(null);
                                return;
                              }
                              setConfirmModal({
                                isOpen: true,
                                title: "等級マスタを更新",
                                message: "以下の変更を保存しますか？",
                                confirmText: "保存",
                                variant: "info",
                                changes,
                                action: { type: "update", tierId: tier.id, payload: edited } });
                            }}
                          >
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTiers(savedTiers);
                              setEditingId(null);
                            }}
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setEditingId(tier.id);
                            }}
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant={tier.isActive ? "warning" : "success"}
                            onClick={() => {
                              const changes = buildChanges({ type: "toggle", tierId: tier.id, nextActive: !tier.isActive, payload: {} }, savedTiers);
                              setConfirmModal({
                                isOpen: true,
                                title: tier.isActive ? "等級マスタを無効化" : "等級マスタを有効化",
                                message: tier.isActive
                                  ? "この等級マスタを無効化しますか？（使用中の場合は削除できません）"
                                  : "この等級マスタを有効化しますか？",
                                confirmText: tier.isActive ? "無効化" : "有効化",
                                variant: tier.isActive ? "warning" : "info",
                                changes,
                                action: { type: "toggle", tierId: tier.id, nextActive: !tier.isActive, payload: {} } });
                            }}
                          >
                            {tier.isActive ? "無効化" : "有効化"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "等級マスタを削除",
                                message: `等級マスタ「${tier.label}」を削除しますか？\n\n使用中の場合は削除できず、無効化されます。`,
                                confirmText: "削除",
                                variant: "danger",
                                action: { type: "delete", tierId: tier.id } });
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmModal
          isOpen={confirmModal?.isOpen ?? false}
          title={confirmModal?.title ?? ""}
          message={confirmModal?.message ?? ""}
          confirmText={confirmModal?.confirmText ?? "実行"}
          variant={confirmModal?.variant ?? "info"}
          changes={confirmModal?.changes}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
    </div>
  );
}

