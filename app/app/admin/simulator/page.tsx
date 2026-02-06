"use client";

import { useState, useEffect } from "react";

type GachaType = {
  id: number; // 内部ID（DB）
  code: string; // 外部参照用コード（例: "normal"）
  name: string;
};

type ItemProbability = {
  tierCode: string;
  itemId: number;
  itemName: string;
  tierProbability: number;
  itemWeight: number;
  itemProbability: number;
  combinedProbability: number;
  actualCount: number;
  actualRate: number;
};

type SimulatorResult = {
  gachaTypeId: string;
  gachaTypeName: string;
  iterations: number;
  totalWeight: number;
  results: Record<string, number>;
  actualRates: Record<string, number>;
  expectedRates: Record<string, number>;
  includeItems?: boolean;
  itemProbabilities?: ItemProbability[];
};

type PrizeTier = {
  code: string;
  label: string;
};

export default function SimulatorPage() {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedGachaTypeId, setSelectedGachaTypeId] = useState<string>("");
  const [iterations, setIterations] = useState<number>(10000);
  const [includeItems, setIncludeItems] = useState<boolean>(false);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGachaTypes();
    fetchPrizeTiers();
  }, []);

  const fetchPrizeTiers = async () => {
    try {
      const res = await fetch("/api/prize-tiers");
      if (res.ok) {
        const data = await res.json();
        const tierMap: Record<string, string> = {};
        if (Array.isArray(data.tiers)) {
          data.tiers.forEach((tier: PrizeTier) => {
            tierMap[tier.code] = tier.label;
          });
        }
        setPrizeTiers(tierMap);
      }
    } catch (error) {
      console.error("等級マスタ取得エラー:", error);
    }
  };

  const getTierLabel = (tierCode: string): string => {
    return prizeTiers[tierCode] || tierCode;
  };

  const fetchGachaTypes = async () => {
    try {
      const res = await fetch("/api/admin/gacha-types", {
        headers: {

        },
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("ガチャタイプ一覧の取得に失敗しました");
      }

      const data = await res.json();
      setGachaTypes(data.gachaTypes);
      if (data.gachaTypes.length > 0) {
        setSelectedGachaTypeId(data.gachaTypes[0].code);
      }
    } catch (error) {
      console.error("ガチャタイプ取得エラー:", error);
      setError("ガチャタイプ一覧の取得に失敗しました");
    }
  };

  const handleRun = async () => {
    if (!selectedGachaTypeId) {
      setError("ガチャタイプを選択してください");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/simulator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({
          gachaTypeId: selectedGachaTypeId,
          iterations,
          includeItems,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "シミュレータの実行に失敗しました");
      }

      const data = await res.json();
      setResult(data);
      setError(null);
    } catch (error) {
      console.error("シミュレータ実行エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "シミュレータの実行に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* 設定 */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          シミュレーション設定
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ガチャタイプ
            </label>
            <select
              value={selectedGachaTypeId}
              onChange={(e) => setSelectedGachaTypeId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            >
              {gachaTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              実行回数
            </label>
            <input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 10000)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              min="100"
              max="1000000"
              step="100"
            />
            <p className="mt-1 text-xs text-gray-500">
              100 ～ 1,000,000 回の範囲で指定できます
            </p>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeItems}
                onChange={(e) => setIncludeItems(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                アイテムの当選確率も表示する（アプリ側と同じ2段階抽選ロジック）
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              チェックすると、等級抽選→アイテム抽選の2段階で確率を計算します
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={loading}
            className="rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "実行中..." : "シミュレーション実行"}
          </button>
        </div>
      </div>

      {/* 結果 */}
      {result && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            {result.gachaTypeName} のシミュレーション結果
          </h2>
          <div className="mb-4 text-sm text-gray-600">
            実行回数: {result.iterations.toLocaleString()} 回 / 重みの合計:{" "}
            {result.totalWeight}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    レアリティ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    獲得数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    実際の排出率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    設定確率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    差分
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Object.keys(result.results).map((rarity) => (
                  <tr key={rarity} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {getTierLabel(rarity)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {result.results[rarity].toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {result.actualRates[rarity].toFixed(2)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {result.expectedRates[rarity].toFixed(2)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <span
                        className={
                          Math.abs(
                            result.actualRates[rarity] -
                              result.expectedRates[rarity]
                          ) < 0.5
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {(
                          result.actualRates[rarity] -
                          result.expectedRates[rarity]
                        ).toFixed(2)}
                        %
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* アイテムの当選確率テーブル */}
          {result.includeItems && result.itemProbabilities && result.itemProbabilities.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                アイテム別当選確率（等級×アイテムの組み合わせ確率）
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        等級
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        アイテム名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        等級確率
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        アイテム重み
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        アイテム確率（等級内）
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        組み合わせ確率
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        実際の獲得数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        実際の排出率
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        差分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {result.itemProbabilities.map((item, index) => (
                      <tr key={`${item.tierCode}-${item.itemId}-${index}`} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {getTierLabel(item.tierCode)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.itemName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.tierProbability.toFixed(2)}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.itemWeight}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.itemProbability.toFixed(2)}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                          {item.combinedProbability.toFixed(4)}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.actualCount.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.actualRate.toFixed(4)}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <span
                            className={
                              Math.abs(item.actualRate - item.combinedProbability) < 0.1
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {(item.actualRate - item.combinedProbability).toFixed(4)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
