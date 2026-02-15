"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Tooltip from "@/components/admin/ui/Tooltip";
import WeightExplanationModal from "@/components/admin/WeightExplanationModal";

type TierWeightLite = { tierCode: string; weight: number; isActive: boolean };
type GachaTypeLite = {
  id: string;
  name: string;
  tierWeights?: TierWeightLite[];
};
type PrizeItemLite = { id: number; name: string; isActive: boolean };
type PrizeTierLite = {
  code: string;
  label: string;
  isActive: boolean;
  displayOrder?: number;
};

type Assignment = {
  id: number;
  gachaTypeId: number;
  tierCode: string;
  itemId: number | null;
  rewardType: "ITEM" | "POINTS";
  points: number;
  weight: number;
  isActive: boolean;
  tier?: { code: string; label: string };
  item: {
    id: number;
    name: string;
    isActive: boolean;
  } | null;
};

export default function PrizeAssignmentsPage() {
  const [gachaTypes, setGachaTypes] = useState<GachaTypeLite[]>([]);
  const [items, setItems] = useState<PrizeItemLite[]>([]);
  const [prizeTiers, setPrizeTiers] = useState<PrizeTierLite[]>([]);
  const [selectedGachaTypeId, setSelectedGachaTypeId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showWeightExplanation, setShowWeightExplanation] = useState(false);

  const [newRow, setNewRow] = useState<{
    tierCode: string;
    itemId: string;
    rewardType: "ITEM" | "POINTS";
    points: string;
    weight: string;
    isActive: boolean;
  }>({
    tierCode: "",
    itemId: "",
    rewardType: "ITEM",
    points: "",
    weight: "1",
    isActive: true });

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
      headers: {} });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_authenticated");
      window.location.href = "/admin";
      return;
    }
    if (!res.ok) throw new Error("ガチャタイプ一覧の取得に失敗しました");
    const data = await res.json();
    const list: GachaTypeLite[] = (data.gachaTypes || []).map((gt: any) => ({
      // NOTE: 外部参照は code を使う（API/URLの互換のためキー名は id のまま）
      id: gt.code,
      name: gt.name,
      tierWeights: Array.isArray(gt.tierWeights)
        ? gt.tierWeights.map((tw: any) => ({
            tierCode: tw.tierCode,
            weight: Number(tw.weight) || 0,
            isActive: !!tw.isActive }))
        : [] }));
    setGachaTypes(list);
    if (!selectedGachaTypeId && list.length > 0) {
      setSelectedGachaTypeId(list[0].id);
    }
  };

  const fetchPrizeTiers = async () => {
    const res = await fetch("/api/admin/prize-tiers", {
      headers: {} });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_authenticated");
      window.location.href = "/admin";
      return;
    }
    if (!res.ok) throw new Error("等級一覧の取得に失敗しました");
    const data = await res.json();
    const list: PrizeTierLite[] = Array.isArray(data.tiers)
      ? data.tiers.map((tier: any) => ({
          code: tier.code,
          label: tier.label,
          isActive: !!tier.isActive,
          displayOrder: tier.displayOrder ?? 0 }))
      : [];
    setPrizeTiers(list);
  };

  const fetchItems = async () => {
    const res = await fetch("/api/admin/items?isActive=true", {
      headers: {} });
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
      isActive: !!it.isActive }));
    setItems(list);
  };

  const fetchAssignments = async (gachaTypeId: string) => {
    if (!gachaTypeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/prize-assignments?gachaTypeId=${encodeURIComponent(
          gachaTypeId
        )}`,
        { headers: {} }
      );
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "景品割当一覧の取得に失敗しました");
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await Promise.all([fetchGachaTypes(), fetchItems(), fetchPrizeTiers()]);
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

  const sortedPrizeTiers = useMemo(
    () =>
      prizeTiers
        .filter((tier) => tier.isActive)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [prizeTiers]
  );

  useEffect(() => {
    if (!newRow.tierCode && sortedPrizeTiers.length > 0) {
      setNewRow((prev) => ({ ...prev, tierCode: sortedPrizeTiers[0].code }));
    }
  }, [newRow.tierCode, sortedPrizeTiers]);

  const tierLabel = (tierCode: string) =>
    sortedPrizeTiers.find((r) => r.code === tierCode)?.label || tierCode;

  const selectedGachaType = useMemo(
    () => gachaTypes.find((gt) => gt.id === selectedGachaTypeId),
    [gachaTypes, selectedGachaTypeId]
  );

  const tierWeightMap = useMemo(() => {
    const map: Record<string, { weight: number; isActive: boolean }> = {};
    (selectedGachaType?.tierWeights || []).forEach((tw) => {
      map[tw.tierCode] = { weight: tw.weight, isActive: tw.isActive };
    });
    return map;
  }, [selectedGachaType]);

  const totalTierWeight = useMemo(
    () =>
      Object.values(tierWeightMap).reduce(
        (sum, tw) => sum + (tw.isActive ? tw.weight : 0),
        0
      ),
    [tierWeightMap]
  );

  const tierTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    assignments.forEach((assignment) => {
      if (!assignment.isActive) return;
      totals[assignment.tierCode] =
        (totals[assignment.tierCode] || 0) + assignment.weight;
    });
    return totals;
  }, [assignments]);

  const formatPercent = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return "-";
    return `${(value * 100).toFixed(4)}%`;
  };

  const getTierProbability = (tierCode: string) => {
    const tier = tierWeightMap[tierCode];
    if (!tier) return null;
    if (!tier.isActive) return 0;
    if (totalTierWeight <= 0) return null;
    return tier.weight / totalTierWeight;
  };

  const getItemShare = (assignment: Assignment) => {
    if (!assignment.isActive) return 0;
    const total = tierTotals[assignment.tierCode] || 0;
    if (total <= 0) return null;
    return assignment.weight / total;
  };

  const getOverallProbability = (assignment: Assignment) => {
    const tierProbability = getTierProbability(assignment.tierCode);
    const itemShare = getItemShare(assignment);
    if (tierProbability === null || itemShare === null) return null;
    return tierProbability * itemShare;
  };

  const openConfirm = (args: Omit<NonNullable<typeof confirm>, "isOpen">) =>
    setConfirm({ isOpen: true, ...args });

  const closeConfirm = () => setConfirm(null);

  const createAssignment = async () => {
    setError(null);
    setSuccess(null);
    const itemId = Number(newRow.itemId);
    const points = Number(newRow.points);
    const weight = Number(newRow.weight);
    if (!selectedGachaTypeId) {
      setError("ガチャタイプを選択してください");
      return;
    }
    if (newRow.rewardType === "ITEM") {
      if (!Number.isFinite(itemId) || itemId <= 0) {
        setError("景品（アイテム）を選択してください");
        return;
      }
    } else {
      if (!Number.isFinite(points) || points <= 0) {
        setError("ポイント数は1以上である必要があります");
        return;
      }
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("重みは1以上である必要があります");
      return;
    }

    const item = items.find((i) => i.id === itemId);
    const rewardLabel =
      newRow.rewardType === "POINTS"
        ? `ポイント付与（${points.toLocaleString()}pt）`
        : item
        ? `${item.name}（ID:${item.id}）`
        : `ID:${itemId}`;
    openConfirm({
      title: "景品割当の追加",
      message: "この内容で景品割当を追加します。よろしいですか？",
      confirmText: "追加",
      variant: "info",
      changes: [
        { label: "ガチャタイプ", from: "-", to: selectedGachaTypeId },
        { label: "等級", from: "-", to: tierLabel(newRow.tierCode) },
        { label: "景品", from: "-", to: rewardLabel },
        { label: "報酬種別", from: "-", to: newRow.rewardType },
        { label: "重み", from: "-", to: String(weight) },
        { label: "状態", from: "-", to: newRow.isActive ? "有効" : "無効" },
      ],
      onConfirm: async () => {
        setSavingId("__create__");
        try {
          const res = await fetch("/api/admin/prize-assignments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json" },
            body: JSON.stringify({
              gachaTypeId: selectedGachaTypeId,
              tierCode: newRow.tierCode,
              rewardType: newRow.rewardType,
              itemId: newRow.rewardType === "ITEM" ? itemId : null,
              points: newRow.rewardType === "POINTS" ? points : 0,
              weight,
              isActive: newRow.isActive }) });
          if (res.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            window.location.href = "/admin";
            return;
          }
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "景品割当の追加に失敗しました");
          setSuccess("景品割当を追加しました");
          setNewRow({
            tierCode: newRow.tierCode,
            itemId: "",
            rewardType: "ITEM",
            points: "",
            weight: "1",
            isActive: true });
          await fetchAssignments(selectedGachaTypeId);
        } finally {
          setSavingId(null);
        }
      } });
  };

  const saveAssignment = async (row: Assignment) => {
    setError(null);
    setSuccess(null);
    const rewardLabel =
      row.rewardType === "POINTS"
        ? `ポイント付与（${row.points.toLocaleString()}pt）`
        : row.item
        ? `${row.item.name}（ID:${row.item.id}）`
        : "未設定";
    openConfirm({
      title: "景品割当の保存",
      message: "この変更を保存します。よろしいですか？",
      confirmText: "保存",
      variant: "info",
      changes: [
        { label: "等級", from: "-", to: tierLabel(row.tierCode) },
        { label: "景品", from: "-", to: rewardLabel },
        { label: "報酬種別", from: "-", to: row.rewardType },
        { label: "重み", from: "-", to: String(row.weight) },
        { label: "状態", from: "-", to: row.isActive ? "有効" : "無効" },
      ],
      onConfirm: async () => {
        setSavingId(String(row.id));
        try {
          const res = await fetch(`/api/admin/prize-assignments/${row.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json" },
            body: JSON.stringify({
              tierCode: row.tierCode,
              rewardType: row.rewardType,
              itemId: row.rewardType === "ITEM" ? row.itemId : null,
              points: row.rewardType === "POINTS" ? row.points : 0,
              weight: row.weight,
              isActive: row.isActive }) });
          if (res.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            window.location.href = "/admin";
            return;
          }
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "景品割当の保存に失敗しました");
          setSuccess("保存しました");
          await fetchAssignments(selectedGachaTypeId);
        } finally {
          setSavingId(null);
        }
      } });
  };

  const deleteAssignment = async (row: Assignment) => {
    setError(null);
    setSuccess(null);
    const rewardLabel =
      row.rewardType === "POINTS"
        ? `ポイント付与（${row.points.toLocaleString()}pt）`
        : row.item
        ? `${row.item.name}（ID:${row.item.id}）`
        : "未設定";
    openConfirm({
      title: "景品割当の削除",
      message: "この割当を削除しますか？この操作は取り消せません。",
      confirmText: "削除",
      variant: "danger",
      changes: [
        {
          label: "等級",
          from: "割当済み",
          to: `削除（${tierLabel(row.tierCode)}）` },
        {
          label: "景品",
          from: "割当済み",
          to: rewardLabel },
      ],
      onConfirm: async () => {
        setSavingId(`__delete__:${row.id}`);
        try {
          const res = await fetch(`/api/admin/prize-assignments/${row.id}`, {
            method: "DELETE",
            headers: {} });
          if (res.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            window.location.href = "/admin";
            return;
          }
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "景品割当の削除に失敗しました");
          setSuccess("削除しました");
          await fetchAssignments(selectedGachaTypeId);
        } finally {
          setSavingId(null);
        }
      } });
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
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    1. 等級
                  </label>
                  <select
                    value={newRow.tierCode}
                    onChange={(e) =>
                      setNewRow((p) => ({ ...p, tierCode: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  >
                    {sortedPrizeTiers.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    2. 報酬種別
                  </label>
                  <select
                    value={newRow.rewardType}
                    onChange={(e) =>
                      setNewRow((p) => ({
                        ...p,
                        rewardType: e.target.value as "ITEM" | "POINTS",
                        itemId: "",
                        points: "" }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  >
                    <option value="ITEM">アイテム</option>
                    <option value="POINTS">ポイント</option>
                  </select>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    3. 景品 / ポイント
                  </label>
                  {newRow.rewardType === "ITEM" ? (
                    <select
                      value={newRow.itemId}
                      onChange={(e) =>
                        setNewRow((p) => ({ ...p, itemId: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                    >
                      <option value="">景品（アイテム）を選択</option>
                      {items.map((it) => (
                        <option key={it.id} value={String(it.id)}>
                          {it.name}（ID:{it.id}）
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={newRow.points}
                      onChange={(e) =>
                        setNewRow((p) => ({ ...p, points: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      placeholder="付与ポイント"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>4. 重み</span>
                    <Tooltip
                      content={
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">同じ等級内での比率</p>
                          <p className="text-xs">値が大きいほど当たりやすくなります。</p>
                        </div>
                      }
                      position="top"
                    >
                      <button
                        type="button"
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700"
                        aria-label="重みの説明"
                      >
                        ?
                      </button>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newRow.weight}
                    onChange={(e) =>
                      setNewRow((p) => ({ ...p, weight: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="重み"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    5. 状態
                  </label>
                  <label className="flex h-[42px] items-center gap-2 rounded-md border border-gray-300 bg-white px-3">
                    <input
                      type="checkbox"
                      checked={newRow.isActive}
                      onChange={(e) =>
                        setNewRow((p) => ({ ...p, isActive: e.target.checked }))
                      }
                    />
                    <span className="text-sm text-gray-900">
                      {newRow.isActive ? "有効" : "無効"}
                    </span>
                  </label>
                </div>
              </div>

              {newRow.rewardType === "POINTS" && (
                <p className="mb-2 text-xs text-gray-500">
                  ポイント報酬を選択中です。アイテムレコードは割り当てません。
                </p>
              )}

              <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                追加内容:
                {" "}
                <span className="font-semibold">{tierLabel(newRow.tierCode)}</span>
                {" / "}
                <span className="font-semibold">
                  {newRow.rewardType === "POINTS"
                    ? `ポイント ${newRow.points || "-"}pt`
                    : newRow.itemId
                    ? `${items.find((i) => String(i.id) === newRow.itemId)?.name || "アイテム"}`
                    : "アイテム未選択"}
                </span>
                {" / 重み "}
                <span className="font-semibold">{newRow.weight || "-"}</span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={createAssignment}
                  disabled={savingId === "__create__"}
                  className="rounded-md bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingId === "__create__" ? "追加中..." : "この内容で追加"}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-900">
                <span className="text-xs text-gray-500">
                  追加後も一覧から編集・無効化できます
                </span>
              </label>
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
        <p className="mb-4 text-xs text-gray-500">
          確率は「有効な等級重み」と「有効な割当」を基準に計算しています。
        </p>

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
                    報酬
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                    景品
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <span>重み</span>
                      <Tooltip
                        content={
                          <div className="space-y-2">
                            <p className="text-base font-semibold">重みによる抽選の仕組み</p>
                            <p className="text-sm leading-relaxed">
                              同じ等級内での景品の当たりやすさを表します。
                            </p>
                            <p className="text-sm leading-relaxed">
                              重みの合計を100にする必要はありません。
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowWeightExplanation(true);
                              }}
                              className="mt-2 text-sm font-medium text-blue-300 underline hover:no-underline hover:text-blue-200"
                            >
                              詳細な図解を見る →
                            </button>
                          </div>
                        }
                        position="top"
                      >
                        <button
                          type="button"
                          onClick={() => setShowWeightExplanation(true)}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 hover:bg-blue-200"
                          aria-label="重み設定の説明を見る"
                        >
                          ?
                        </button>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                    等級内確率
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                    等級確率
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                    ガチャ全体確率
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
                        value={a.tierCode}
                        onChange={(e) =>
                          setAssignments((prev) =>
                            prev.map((x) =>
                              x.id === a.id
                                ? { ...x, tierCode: e.target.value }
                                : x
                            )
                          )
                        }
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                      >
                        {sortedPrizeTiers.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      <select
                        value={a.rewardType}
                        onChange={(e) => {
                          const nextType = e.target.value as "ITEM" | "POINTS";
                          setAssignments((prev) =>
                            prev.map((x) =>
                              x.id === a.id
                                ? {
                                    ...x,
                                    rewardType: nextType,
                                    itemId: nextType === "ITEM" ? x.itemId : null,
                                    item: nextType === "ITEM" ? x.item : null,
                                    points: nextType === "POINTS" ? x.points || 100 : 0 }
                                : x
                            )
                          );
                        }}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                      >
                        <option value="ITEM">アイテム</option>
                        <option value="POINTS">ポイント</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {a.rewardType === "POINTS" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={a.points}
                            onChange={(e) =>
                              setAssignments((prev) =>
                                prev.map((x) =>
                                  x.id === a.id
                                    ? { ...x, points: Number(e.target.value) }
                                    : x
                                )
                              )
                            }
                            className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                          />
                          <span className="text-xs text-gray-500">pt</span>
                        </div>
                      ) : (
                        <select
                          value={a.itemId ? String(a.itemId) : ""}
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
                                        ? {
                                            id: it.id,
                                            name: it.name,
                                            isActive: it.isActive }
                                        : x.item }
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
                      )}
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
                      {formatPercent(getItemShare(a))}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatPercent(getTierProbability(a.tierCode))}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatPercent(getOverallProbability(a))}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={a.isActive}
                          onChange={(e) =>
                            setAssignments((prev) =>
                              prev.map((x) =>
                                x.id === a.id
                                  ? { ...x, isActive: e.target.checked }
                                  : x
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
                          {savingId === `__delete__:${a.id}`
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
      <WeightExplanationModal
        isOpen={showWeightExplanation}
        onClose={() => setShowWeightExplanation(false)}
        title="重みによる抽選の仕組み"
      />
    </div>
  );
}
