"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { getAdminAuthToken } from "@/lib/admin-auth";
import type { PointPlan } from "@/lib/point-plan-types";

type AdminPointPlan = PointPlan & {
  createdAt?: string;
  updatedAt?: string;
};

type PointPlanCreatePayload = {
  id: string;
  label: string;
  points: number;
  bonusFreePoints: number;
  price: number;
  displayOrder: number;
  isActive: boolean;
};

type PointPlanUpdatePayload = {
  label: string;
  points: number;
  bonusFreePoints: number;
  price: number;
  displayOrder: number;
  isActive: boolean;
};

type ConfirmAction =
  | { type: "create"; payload: PointPlanCreatePayload }
  | { type: "update"; planId: string; payload: PointPlanUpdatePayload }
  | {
      type: "toggle";
      planId: string;
      nextActive: boolean;
      payload: PointPlanUpdatePayload;
    }
  | { type: "delete"; planId: string };

export default function AdminPointPlansPage() {
  const [plans, setPlans] = useState<AdminPointPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<AdminPointPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newPlan, setNewPlan] = useState<{
    id: string;
    label: string;
    points: string;
    bonusFreePoints: string;
    price: string;
    displayOrder: string;
    isActive: boolean;
  }>({
    id: "",
    label: "",
    points: "",
    bonusFreePoints: "0",
    price: "",
    displayOrder: "0",
    isActive: true,
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "info";
    changes?: Array<{ label: string; from: string; to: string }>;
    action: ConfirmAction;
  } | null>(null);

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
      const next = Array.isArray(data.plans) ? data.plans : [];
      setPlans(next);
      setSavedPlans(next);
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

  const createPlan = async (payload: PointPlanCreatePayload) => {
    setError(null);
    setSuccess(null);

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
      if (!res.ok)
        throw new Error(data.error || "購入プランの作成に失敗しました");

      setSuccess("購入プランを作成しました");
      setNewPlan({
        id: "",
        label: "",
        points: "",
        bonusFreePoints: "0",
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

  const updatePlan = async (
    planId: string,
    payload: PointPlanUpdatePayload
  ) => {
    setError(null);
    setSuccess(null);

    try {
      setSavingId(planId);
      const res = await fetch(
        `/api/admin/point-plans/${encodeURIComponent(planId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Auth": token,
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "購入プランの更新に失敗しました");

      setSuccess("購入プランを更新しました");
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, ...(data.plan ?? {}) } : p))
      );
      setSavedPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, ...(data.plan ?? {}) } : p))
      );
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingId(null);
    }
  };

  const deletePlan = async (planId: string) => {
    setError(null);
    setSuccess(null);
    try {
      setSavingId(`__delete__:${planId}`);
      const res = await fetch(
        `/api/admin/point-plans/${encodeURIComponent(planId)}`,
        {
          method: "DELETE",
          headers: { "X-Admin-Auth": token },
        }
      );
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "購入プランの削除に失敗しました");

      setSuccess("購入プランを削除しました");
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingId(null);
    }
  };

  const closeConfirm = () => setConfirmModal(null);

  const runConfirm = async () => {
    if (!confirmModal) return;
    const action = confirmModal.action;
    closeConfirm();
    if (action.type === "create") {
      await createPlan(action.payload);
      return;
    }
    if (action.type === "update") {
      await updatePlan(action.planId, action.payload);
      return;
    }
    if (action.type === "toggle") {
      await updatePlan(action.planId, action.payload);
      await fetchPlans();
      return;
    }
    if (action.type === "delete") {
      await deletePlan(action.planId);
      return;
    }
  };

  const formatBool = (v: boolean) => (v ? "有効" : "無効");
  const toNumStr = (v: number) => Number(v).toLocaleString();

  const buildPlanChanges = (before: AdminPointPlan, after: AdminPointPlan) => {
    const changes: Array<{ label: string; from: string; to: string }> = [];
    if (before.label !== after.label)
      changes.push({ label: "ラベル", from: before.label, to: after.label });
    if (before.points !== after.points)
      changes.push({
        label: "ポイント",
        from: toNumStr(before.points),
        to: toNumStr(after.points),
      });
    if (before.bonusFreePoints !== after.bonusFreePoints)
      changes.push({
        label: "おまけ無償ポイント",
        from: toNumStr(before.bonusFreePoints),
        to: toNumStr(after.bonusFreePoints),
      });
    if (before.price !== after.price)
      changes.push({
        label: "価格(円)",
        from: toNumStr(before.price),
        to: toNumStr(after.price),
      });
    if (before.displayOrder !== after.displayOrder)
      changes.push({
        label: "表示順",
        from: String(before.displayOrder),
        to: String(after.displayOrder),
      });
    if (before.isActive !== after.isActive)
      changes.push({
        label: "状態",
        from: formatBool(before.isActive),
        to: formatBool(after.isActive),
      });
    return changes;
  };

  const requestCreateConfirm = () => {
    setError(null);
    setSuccess(null);
    const payload = {
      id: newPlan.id.trim(),
      label: newPlan.label.trim(),
      points: Number(newPlan.points),
      bonusFreePoints: Number(newPlan.bonusFreePoints),
      price: Number(newPlan.price),
      displayOrder:
        newPlan.displayOrder.trim() === ""
          ? defaultNextOrder
          : Number(newPlan.displayOrder),
      isActive: newPlan.isActive,
    };
    setConfirmModal({
      isOpen: true,
      title: "購入プランの作成",
      message: "この内容で購入プランを作成します。よろしいですか？",
      confirmText: "作成",
      variant: "info",
      changes: [
        { label: "プランID", from: "-", to: payload.id || "(未入力)" },
        { label: "ラベル", from: "-", to: payload.label || "(未入力)" },
        { label: "ポイント", from: "-", to: toNumStr(payload.points) },
        {
          label: "おまけ無償ポイント",
          from: "-",
          to: toNumStr(payload.bonusFreePoints),
        },
        { label: "価格(円)", from: "-", to: toNumStr(payload.price) },
        { label: "表示順", from: "-", to: String(payload.displayOrder) },
        { label: "状態", from: "-", to: formatBool(payload.isActive) },
      ],
      action: { type: "create", payload },
    });
  };

  const requestUpdateConfirm = (after: AdminPointPlan) => {
    setError(null);
    setSuccess(null);
    const before = savedPlans.find((p) => p.id === after.id);
    if (!before) {
      setError("変更前データが見つかりません。再読み込みしてください。");
      return;
    }
    const payload = {
      label: after.label,
      points: after.points,
      bonusFreePoints: after.bonusFreePoints,
      price: after.price,
      displayOrder: after.displayOrder,
      isActive: after.isActive,
    };
    const changes = buildPlanChanges(before, after);
    if (changes.length === 0) {
      setSuccess("変更点がないため、保存は不要です。");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "購入プランの保存",
      message: "以下の内容に変更して保存します。よろしいですか？",
      confirmText: "保存",
      variant: "info",
      changes,
      action: { type: "update", planId: after.id, payload },
    });
  };

  const requestToggleConfirm = (planId: string, nextActive: boolean) => {
    setError(null);
    setSuccess(null);
    const plan = plans.find((p) => p.id === planId);
    const before = savedPlans.find((p) => p.id === planId);
    if (!plan || !before) return;
    const after = { ...plan, isActive: nextActive };
    const payload = {
      label: after.label,
      points: after.points,
      bonusFreePoints: after.bonusFreePoints,
      price: after.price,
      displayOrder: after.displayOrder,
      isActive: after.isActive,
    };
    setConfirmModal({
      isOpen: true,
      title: "購入プランの状態変更",
      message: nextActive
        ? "このプランを有効化します。よろしいですか？"
        : "このプランを無効化します。（購入画面から選べなくなります）\nよろしいですか？",
      confirmText: nextActive ? "有効化" : "無効化",
      variant: nextActive ? "info" : "warning",
      changes: buildPlanChanges(before, after),
      action: { type: "toggle", planId, nextActive, payload },
    });
  };

  const requestDeleteConfirm = (planId: string) => {
    setError(null);
    setSuccess(null);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setConfirmModal({
      isOpen: true,
      title: "購入プランの削除",
      message: "この購入プランを削除しますか？\nこの操作は取り消せません。",
      confirmText: "削除",
      variant: "danger",
      changes: [
        { label: "プランID", from: "-", to: plan.id },
        { label: "ラベル", from: "-", to: plan.label },
        { label: "ポイント", from: "-", to: toNumStr(plan.points) },
        {
          label: "おまけ無償ポイント",
          from: "-",
          to: toNumStr(plan.bonusFreePoints),
        },
        { label: "価格(円)", from: "-", to: toNumStr(plan.price) },
        { label: "表示順", from: "-", to: String(plan.displayOrder) },
        { label: "状態", from: "-", to: formatBool(plan.isActive) },
      ],
      action: { type: "delete", planId },
    });
  };

  return (
    <div className="w-full">
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 xl:grid-cols-8">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              プランID
            </label>
            <input
              value={newPlan.id}
              onChange={(e) =>
                setNewPlan((p) => ({ ...p, id: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
              placeholder="例: p100"
            />
            <p className="mt-1 text-xs text-black">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              おまけ無償ポイント
            </label>
            <input
              type="number"
              min={0}
              value={newPlan.bonusFreePoints}
              onChange={(e) =>
                setNewPlan((p) => ({ ...p, bonusFreePoints: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
            />
            <p className="mt-1 text-xs text-black">0以上</p>
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
            />
          </div>
          <div className="flex items-end gap-3 lg:col-span-6 xl:col-span-8">
            <label className="flex items-center gap-2 text-sm text-black">
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
              onClick={requestCreateConfirm}
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
                    おまけ無償
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
                    <td className="px-3 py-2 text-sm text-black">{p.id}</td>
                    <td className="px-3 py-2">
                      <input
                        value={p.label}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x) =>
                              x.id === p.id
                                ? { ...x, label: e.target.value }
                                : x
                            )
                          )
                        }
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
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
                        className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={p.bonusFreePoints}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    bonusFreePoints: Number(e.target.value),
                                  }
                                : x
                            )
                          )
                        }
                        className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
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
                        className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
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
                                ? {
                                    ...x,
                                    displayOrder: Number(e.target.value),
                                  }
                                : x
                            )
                          )
                        }
                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
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
                          onClick={() => requestUpdateConfirm(p)}
                          disabled={savingId === p.id}
                          className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                        >
                          {savingId === p.id ? "保存中..." : "保存"}
                        </button>
                        {p.isActive ? (
                          <button
                            onClick={() => requestToggleConfirm(p.id, false)}
                            className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-600"
                          >
                            無効化
                          </button>
                        ) : (
                          <button
                            onClick={() => requestToggleConfirm(p.id, true)}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                          >
                            有効化
                          </button>
                        )}
                        <button
                          onClick={() => requestDeleteConfirm(p.id)}
                          disabled={savingId === `__delete__:${p.id}`}
                          className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-200 disabled:opacity-50"
                        >
                          {savingId === `__delete__:${p.id}`
                            ? "削除中..."
                            : "削除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmModal?.isOpen}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        changes={confirmModal?.changes}
        confirmText={confirmModal?.confirmText ?? "OK"}
        cancelText="キャンセル"
        variant={confirmModal?.variant ?? "info"}
        isConfirmDisabled={savingId !== null}
        onConfirm={runConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
