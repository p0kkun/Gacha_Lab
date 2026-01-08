"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { getAdminAuthToken } from "@/lib/admin-auth";

type GachaTypeLite = { id: string; name: string };
type PrizeItemLite = { id: number; name: string; isActive: boolean };

type Assignment = {
  id: number;
  gachaTypeId: string;
  rarity: string;
  itemId: number;
  weight: number;
  isActive: boolean;
  item: {
    id: number;
    name: string;
    isActive: boolean;
  };
};

const RARITIES: Array<{ value: string; label: string }> = [
  { value: "FIRST_PRIZE", label: "1等" },
  { value: "SECOND_PRIZE", label: "2等" },
  { value: "THIRD_PRIZE", label: "3等" },
  { value: "FOURTH_PRIZE", label: "4等" },
  { value: "FIFTH_PRIZE", label: "5等" },
  { value: "LOSER", label: "ハズレ" },
];

export default function PrizeAssignmentsPage() {
  const token = useMemo(() => getAdminAuthToken() || "", []);
  const [gachaTypes, setGachaTypes] = useState<GachaTypeLite[]>([]);
  const [items, setItems] = useState<PrizeItemLite[]>([]);
  const [selectedGachaTypeId, setSelectedGachaTypeId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newRow, setNewRow] = useState<{
    rarity: string;
    itemId: string;
    weight: string;
    isActive: boolean;
  }>({ rarity: "THIRD_PRIZE", itemId: "", weight: "1", isActive: true });

  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "info";
    changes?: Array<{ label: string; from: string; to: string }>;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const fetchGachaTypes = async () => {
    const res = await fetch("/api/admin/gacha-types", {
      headers: { "X-Admin-Auth": token },
    });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_authenticated");
      window.location.href = "/admin";
      return;
    }
    if (!res.ok) throw new Error("ガチャタイプ一覧の取得に失敗しました");
    const data = await res.json();
    const list: GachaTypeLite[] = (data.gachaTypes || []).map((gt: any) => ({
      id: gt.id,
      name: gt.name,
    }));
    setGachaTypes(list);
    if (!selectedGachaTypeId && list.length > 0) {
      setSelectedGachaTypeId(list[0].id);
    }
  };

  const fetchItems = async () => {
    const res = await fetch("/api/admin/items?isActive=true", {
      headers: { "X-Admin-Auth": token },
    });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_authenticated");
      window.location.href = "/admin";
      return;
    }
    if (!res.ok) throw new Error("景品（アイテム）一覧の取得に失敗しました");
    const data = await res.json();
    const list: PrizeItemLite[] = (data.items || []).map((it: any) => ({
      id: it.id,
      name: it.name,
      isActive: !!it.isActive,
    }));
    setItems(list);
  };

  const fetchAssignments = async (gachaTypeId: string) => {
    if (!gachaTypeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/prize-assignments?gachaTypeId=${encodeURIComponent(gachaTypeId)}`,
        { headers: { "X-Admin-Auth": token } }
      );
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "景品割当一覧の取得に失敗しました");
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await Promise.all([fetchGachaTypes(), fetchItems()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "初期化に失敗しました");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAssignments(selectedGachaTypeId).catch((e) =>
      setError(e instanceof Error ? e.message : "読み込みに失敗しました")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGachaTypeId]);

  const rarityLabel = (rarity: string) =>
    RARITIES.find((r) => r.value === rarity)?.label || rarity;

  const openConfirm = (args: Omit<NonNullable<typeof confirm>, "isOpen">) =>
    setConfirm({ isOpen: true, ...args });

  const closeConfirm = () => setConfirm(null);

  const createAssignment = async () => {
    setError(null);
    setSuccess(null);
    const itemId = Number(newRow.itemId);
    const weight = Number(newRow.weight);
    if (!selectedGachaTypeId) {
      setError("ガチャタイプを選択してください");
      return;
    }
    if (!Number.isFinite(itemId) || itemId <= 0) {
      setError("景品（アイテム）を選択してください");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("重みは1以上である必要があります");
      return;
    }

    const item = items.find((i) => i.id === itemId);
    openConfirm({
      title: "景品割当の追加",
      message: "この内容で景品割当を追加します。よろしいですか？",
      confirmText: "追加",
      variant: "info",
      changes: [
        { label: "ガチャタイプ", from: "-", to: selectedGachaTypeId },
        { label: "等級", from: "-", to: rarityLabel(newRow.rarity) },
        { label: "景品", from: "-", to: item ? `${item.name}（ID:${item.id}）` : `ID:${itemId}` },
        { label: "重み", from: "-", to: String(weight) },
        { label: "状態", from: "-", to: newRow.isActive ? "有効" : "無効" },
      ],
      onConfirm: async () => {
        setSavingId("__create__");
        try {
          const res = await fetch("/api/admin/prize-assignments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Admin-Auth": token,
            },
            body: JSON.stringify({
              gachaTypeId: selectedGachaTypeId,
              rarity: newRow.rarity,
              itemId,
              weight,
              isActive: newRow.isActive,
            }),
          });
          if (res.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            window.location.href = "/admin";
            return;
          }
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "景品割当の追加に失敗しました");
          setSuccess("景品割当を追加しました");
          setNewRow({ rarity: newRow.rarity, itemId: "", weight: "1", isActive: true });
          await fetchAssignments(selectedGachaTypeId);
        } finally {
          setSavingId(null);
        }
      },
    });
  };

  const saveAssignment = async (row: Assignment) => {
    setError(null);
    setSuccess(null);
    openConfirm({
      title: "景品割当の保存",
      message: "この変更を保存します。よろしいですか？",
      confirmText: "保存",
      variant: "info",
      changes: [
        { label: "等級", from: "-", to: rarityLabel(row.rarity) },
        { label: "景品", from: "-", to: `${row.item.name}（ID:${row.item.id}）` },
        { label: "重み", from: "-", to: String(row.weight) },
        { label: "状態", from: "-", to: row.isActive ? "有効" : "無効" },
      ],
      onConfirm: async () => {
        setSavingId(String(row.id));
        try {
          const res = await fetch(`/api/admin/prize-assignments/${row.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Admin-Auth": token,
            },
            body: JSON.stringify({
              rarity: row.rarity,
              itemId: row.itemId,
              weight: row.weight,
              isActive: row.isActive,
            }),
          });
          if (res.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            window.location.href = "/admin";
            return;
          }
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "景品割当の保存に失敗しました");
          setSuccess("保存しました");
          await fetchAssignments(selectedGachaTypeId);
        } finally {
          setSavingId(null);
        }
      },
    });
  };

  const deleteAssignment = async (row: Assignment) => {
    setError(null);
    setSuccess(null);
    openConfirm({
      title: "景品割当の削除",
      message: "この割当を削除しますか？この操作は取り消せません。",
      confirmText: "削除",
      variant: "danger",
      changes: [
        { label: "等級", from: "割当済み", to: `削除（${rarityLabel(row.rarity)}）` },
        { label: "景品", from: "割当済み", to: `${row.item.name}（ID:${row.item.id}）` },
      ],
      onConfirm: async () => {
        setSavingId(`__delete__:${row.id}`);
        try {
          const res = await fetch(`/api/admin/prize-assignments/${row.id}`, {
            method: "DELETE",
            headers: { "X-Admin-Auth": token },
          });
          if (res.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            window.location.href = "/admin";
            return;
          }
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "景品割当の削除に失敗しました");
          setSuccess("削除しました");
          await fetchAssignments(selectedGachaTypeId);
        } finally {
          setSavingId(null);
        }
      },
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          景品割当（ガチャ別）
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

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">
                ガチャタイプ
              </label>
              <select
                value={selectedGachaTypeId}
                onChange={(e) => setSelectedGachaTypeId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              >
                {gachaTypes.map((gt) => (
                  <option key={gt.id} value={gt.id}>
                    {gt.name}（{gt.id}）
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                ここで「このガチャではこの景品を何等扱いにするか」を設定します
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                割当を追加
              </label>
              <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={newRow.rarity}
                  onChange={(e) => setNewRow((p) => ({ ...p, rarity: e.target.value }))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  {RARITIES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newRow.itemId}
                  onChange={(e) => setNewRow((p) => ({ ...p, itemId: e.target.value }))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 md:col-span-2"
                >
                  <option value="">景品（アイテム）を選択</option>
                  {items.map((it) => (
                    <option key={it.id} value={String(it.id)}>
                      {it.name}（ID:{it.id}）
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={newRow.weight}
                  onChange={(e) => setNewRow((p) => ({ ...p, weight: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="重み"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={newRow.isActive}
                    onChange={(e) => setNewRow((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  有効
                </label>
                <button
                  onClick={createAssignment}
                  disabled={savingId === "__create__"}
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingId === "__create__" ? "追加中..." : "追加"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">割当一覧</h2>
            <button
              onClick={() => fetchAssignments(selectedGachaTypeId)}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
            >
              再読み込み
            </button>
          </div>

          {loading ? (
            <div className="text-gray-600">読み込み中...</div>
          ) : assignments.length === 0 ? (
            <div className="text-gray-600">
              まだ割当がありません（上で追加してください）
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      等級
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      景品
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      重み
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
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <select
                          value={a.rarity}
                          onChange={(e) =>
                            setAssignments((prev) =>
                              prev.map((x) =>
                                x.id === a.id ? { ...x, rarity: e.target.value } : x
                              )
                            )
                          }
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        >
                          {RARITIES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <select
                          value={String(a.itemId)}
                          onChange={(e) => {
                            const nextId = Number(e.target.value);
                            const it = items.find((i) => i.id === nextId);
                            setAssignments((prev) =>
                              prev.map((x) =>
                                x.id === a.id
                                  ? {
                                      ...x,
                                      itemId: nextId,
                                      item: it
                                        ? { id: it.id, name: it.name, isActive: it.isActive }
                                        : x.item,
                                    }
                                  : x
                              )
                            );
                          }}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        >
                          {items.map((it) => (
                            <option key={it.id} value={String(it.id)}>
                              {it.name}（ID:{it.id}）
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <input
                          type="number"
                          min={1}
                          value={a.weight}
                          onChange={(e) =>
                            setAssignments((prev) =>
                              prev.map((x) =>
                                x.id === a.id
                                  ? { ...x, weight: Number(e.target.value) }
                                  : x
                              )
                            )
                          }
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={a.isActive}
                            onChange={(e) =>
                              setAssignments((prev) =>
                                prev.map((x) =>
                                  x.id === a.id ? { ...x, isActive: e.target.checked } : x
                                )
                              )
                            }
                          />
                          {a.isActive ? "有効" : "無効"}
                        </label>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => saveAssignment(a)}
                            disabled={savingId === String(a.id)}
                            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                          >
                            {savingId === String(a.id) ? "保存中..." : "保存"}
                          </button>
                          <button
                            onClick={() => deleteAssignment(a)}
                            disabled={savingId === `__delete__:${a.id}`}
                            className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-200 disabled:opacity-50"
                          >
                            {savingId === `__delete__:${a.id}` ? "削除中..." : "削除"}
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
          isOpen={!!confirm?.isOpen}
          title={confirm?.title ?? ""}
          message={confirm?.message ?? ""}
          confirmText={confirm?.confirmText ?? "OK"}
          cancelText="キャンセル"
          variant={confirm?.variant ?? "info"}
          changes={confirm?.changes}
          isConfirmDisabled={savingId !== null}
          onConfirm={async () => {
            if (!confirm) return;
            const fn = confirm.onConfirm;
            closeConfirm();
            await fn();
          }}
          onCancel={closeConfirm}
        />
      </div>
    </AdminLayout>
  );
}


