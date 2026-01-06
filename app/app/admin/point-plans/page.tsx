"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { getAdminAuthToken } from "@/lib/admin-auth";
import type { PointPlan } from "@/lib/point-plan-types";

type AdminPointPlan = PointPlan & {
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminPointPlansPage() {
  const [plans, setPlans] = useState<AdminPointPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newPlan, setNewPlan] = useState<{
    id: string;
    label: string;
    points: string;
    price: string;
    displayOrder: string;
    isActive: boolean;
  }>({
    id: "",
    label: "",
    points: "",
    price: "",
    displayOrder: "0",
    isActive: true,
  });

  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    planId: string | null;
    nextActive: boolean;
  }>({ isOpen: false, planId: null, nextActive: false });

  const token = useMemo(() => getAdminAuthToken() || "", []);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/point-plans", {
        headers: { "X-Admin-Auth": token },
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) throw new Error("購入プラン一覧の取得に失敗しました");
      const data = await res.json();
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultNextOrder = useMemo(() => {
    if (plans.length === 0) return 0;
    return Math.max(...plans.map((p) => Number(p.displayOrder) || 0)) + 1;
  }, [plans]);

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);

    const payload = {
      id: newPlan.id.trim(),
      label: newPlan.label.trim(),
      points: Number(newPlan.points),
      price: Number(newPlan.price),
      displayOrder:
        newPlan.displayOrder.trim() === ""
          ? defaultNextOrder
          : Number(newPlan.displayOrder),
      isActive: newPlan.isActive,
    };

    try {
      setSavingId("__create__");
      const res = await fetch("/api/admin/point-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Auth": token,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "購入プランの作成に失敗しました");

      setSuccess("購入プランを作成しました");
      setNewPlan({
        id: "",
        label: "",
        points: "",
        price: "",
        displayOrder: String(defaultNextOrder + 1),
        isActive: true,
      });
      await fetchPlans();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async (plan: AdminPointPlan) => {
    setError(null);
    setSuccess(null);

    const payload = {
      label: plan.label,
      points: plan.points,
      price: plan.price,
      displayOrder: plan.displayOrder,
      isActive: plan.isActive,
    };

    try {
      setSavingId(plan.id);
      const res = await fetch(`/api/admin/point-plans/${encodeURIComponent(plan.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Auth": token,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "購入プランの更新に失敗しました");

      setSuccess("購入プランを更新しました");
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, ...(data.plan ?? {}) } : p))
      );
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingId(null);
    }
  };

  const openToggleConfirm = (planId: string, nextActive: boolean) => {
    setConfirm({ isOpen: true, planId, nextActive });
  };

  const confirmToggle = async () => {
    const planId = confirm.planId;
    if (!planId) {
      setConfirm({ isOpen: false, planId: null, nextActive: false });
      return;
    }

    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      setConfirm({ isOpen: false, planId: null, nextActive: false });
      return;
    }

    setConfirm({ isOpen: false, planId: null, nextActive: false });
    await handleUpdate({ ...plan, isActive: confirm.nextActive });
    await fetchPlans();
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          ポイント購入プラン
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 whitespace-pre-wrap">
            {success}
          </div>
        )}

        {/* 新規作成 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">新規作成</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">
                プランID
              </label>
              <input
                value={newPlan.id}
                onChange={(e) => setNewPlan((p) => ({ ...p, id: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="例: p100"
              />
              <p className="mt-1 text-xs text-gray-500">
                英数字/ハイフン/アンダースコア
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                ラベル
              </label>
              <input
                value={newPlan.label}
                onChange={(e) =>
                  setNewPlan((p) => ({ ...p, label: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="例: 100ポイント"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ポイント
              </label>
              <input
                type="number"
                min={1}
                value={newPlan.points}
                onChange={(e) =>
                  setNewPlan((p) => ({ ...p, points: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                価格(円)
              </label>
              <input
                type="number"
                min={1}
                value={newPlan.price}
                onChange={(e) =>
                  setNewPlan((p) => ({ ...p, price: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                表示順
              </label>
              <input
                type="number"
                value={newPlan.displayOrder}
                onChange={(e) =>
                  setNewPlan((p) => ({ ...p, displayOrder: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div className="flex items-end gap-3 md:col-span-6">
              <label className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={newPlan.isActive}
                  onChange={(e) =>
                    setNewPlan((p) => ({ ...p, isActive: e.target.checked }))
                  }
                />
                有効
              </label>
              <button
                onClick={handleCreate}
                disabled={savingId === "__create__"}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {savingId === "__create__" ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>

        {/* 一覧 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">一覧</h2>
            <button
              onClick={fetchPlans}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
            >
              再読み込み
            </button>
          </div>

          {loading ? (
            <div className="text-gray-600">読み込み中...</div>
          ) : plans.length === 0 ? (
            <div className="text-gray-600">プランがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      ラベル
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      ポイント
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      価格(円)
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      表示順
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      状態
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-sm text-gray-900">{p.id}</td>
                      <td className="px-3 py-2">
                        <input
                          value={p.label}
                          onChange={(e) =>
                            setPlans((prev) =>
                              prev.map((x) =>
                                x.id === p.id ? { ...x, label: e.target.value } : x
                              )
                            )
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={p.points}
                          onChange={(e) =>
                            setPlans((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, points: Number(e.target.value) }
                                  : x
                              )
                            )
                          }
                          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={p.price}
                          onChange={(e) =>
                            setPlans((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, price: Number(e.target.value) }
                                  : x
                              )
                            )
                          }
                          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={p.displayOrder}
                          onChange={(e) =>
                            setPlans((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, displayOrder: Number(e.target.value) }
                                  : x
                              )
                            )
                          }
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {p.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            有効
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            無効
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleUpdate(p)}
                            disabled={savingId === p.id}
                            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                          >
                            {savingId === p.id ? "保存中..." : "保存"}
                          </button>
                          {p.isActive ? (
                            <button
                              onClick={() => openToggleConfirm(p.id, false)}
                              className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-600"
                            >
                              無効化
                            </button>
                          ) : (
                            <button
                              onClick={() => openToggleConfirm(p.id, true)}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                            >
                              有効化
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm.isOpen}
        title="購入プランの変更"
        message={
          confirm.nextActive
            ? "このプランを有効化しますか？"
            : "このプランを無効化しますか？（購入画面から選べなくなります）"
        }
        confirmText={confirm.nextActive ? "有効化" : "無効化"}
        cancelText="キャンセル"
        variant={confirm.nextActive ? "info" : "warning"}
        onConfirm={confirmToggle}
        onCancel={() => setConfirm({ isOpen: false, planId: null, nextActive: false })}
      />
    </AdminLayout>
  );
}


