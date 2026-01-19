"use client";

import { useState, useEffect } from "react";
import { getAdminAuthToken } from "@/lib/admin-auth";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type PurchaseHistoryStat = {
  date?: string;
  planId?: string;
  planLabel?: string;
  count: number;
  totalAmount: number;
  totalPaidPoints: number;
  totalFreePoints: number;
};

type PurchaseHistoryStatistics = {
  period: string;
  groupBy: string;
  startDate: string;
  endDate: string;
  summary: {
    totalCount: number;
    totalAmount: number;
    totalPaidPoints: number;
    totalFreePoints: number;
    uniqueUserCount: number;
    averageAmount: number;
    averageAmountPerUser: number;
    averagePurchaseCountPerUser: number;
  };
  comparison: {
    countChange: number;
    amountChange: number;
    userCountChange: number;
  } | null;
  data: PurchaseHistoryStat[];
  plans: Array<{ id: string; label: string; points: number; price: number }>;
};

export default function PurchaseHistoryContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<PurchaseHistoryStatistics | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "plan">("day");
  const [planId, setPlanId] = useState<string>("");

  const token = getAdminAuthToken();

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          period,
          groupBy,
        });
        if (planId) {
          params.append("planId", planId);
        }

        const res = await fetch(`/api/admin/statistics/purchase-history?${params.toString()}`, {
          headers: { "X-Admin-Auth": token },
        });

        if (res.status === 401) {
          sessionStorage.removeItem("admin_authenticated");
          window.location.href = "/admin";
          return;
        }

        if (!res.ok) {
          throw new Error("統計情報の取得に失敗しました");
        }

        const data = await res.json();
        setStatistics(data);
      } catch (e) {
        console.error("統計情報取得エラー:", e);
        setError(e instanceof Error ? e.message : "統計情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [period, groupBy, planId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p className="font-semibold">エラー</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
        データがありません
      </div>
    );
  }

  const chartData = statistics.data.map((item) => {
    if (groupBy === "plan") {
      return {
        name: item.planLabel || "プラン不明",
        count: item.count,
        amount: item.totalAmount,
        paidPoints: item.totalPaidPoints,
        freePoints: item.totalFreePoints,
      };
    } else {
      return {
        name: item.date || "",
        count: item.count,
        amount: item.totalAmount,
        paidPoints: item.totalPaidPoints,
        freePoints: item.totalFreePoints,
      };
    }
  });

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="mb-4 text-lg font-semibold">フィルター</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              期間
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month")}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="day">日</option>
              <option value="week">週</option>
              <option value="month">月</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              集計方法
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month" | "plan")}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="day">日別</option>
              <option value="week">週別</option>
              <option value="month">月別</option>
              <option value="plan">プラン別</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              プラン（オプション）
            </label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">全てのプラン</option>
              {statistics.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">総購入回数</div>
          <div className="mt-1 text-2xl font-bold text-gray-800">
            {statistics.summary.totalCount.toLocaleString()}
          </div>
          {statistics.comparison && (
            <div className={`mt-1 text-xs ${statistics.comparison.countChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {statistics.comparison.countChange >= 0 ? '↑' : '↓'} {Math.abs(statistics.comparison.countChange)}% ({period === 'month' ? '前月比' : '前週比'})
            </div>
          )}
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">総購入金額</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            ¥{statistics.summary.totalAmount.toLocaleString()}
          </div>
          {statistics.comparison && (
            <div className={`mt-1 text-xs ${statistics.comparison.amountChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {statistics.comparison.amountChange >= 0 ? '↑' : '↓'} {Math.abs(statistics.comparison.amountChange)}% ({period === 'month' ? '前月比' : '前週比'})
            </div>
          )}
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">総付与有償ポイント</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {statistics.summary.totalPaidPoints.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">総付与無償ポイント</div>
          <div className="mt-1 text-2xl font-bold text-purple-600">
            {statistics.summary.totalFreePoints.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 追加指標 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">ユニーク購入者数</div>
          <div className="mt-1 text-2xl font-bold text-indigo-600">
            {statistics.summary.uniqueUserCount.toLocaleString()}
          </div>
          {statistics.comparison && (
            <div className={`mt-1 text-xs ${statistics.comparison.userCountChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {statistics.comparison.userCountChange >= 0 ? '↑' : '↓'} {Math.abs(statistics.comparison.userCountChange)}% ({period === 'month' ? '前月比' : '前週比'})
            </div>
          )}
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">平均単価</div>
          <div className="mt-1 text-2xl font-bold text-orange-600">
            ¥{statistics.summary.averageAmount.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">1ユーザーあたり平均購入額</div>
          <div className="mt-1 text-2xl font-bold text-teal-600">
            ¥{statistics.summary.averageAmountPerUser.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">1ユーザーあたり平均購入回数</div>
          <div className="mt-1 text-2xl font-bold text-pink-600">
            {statistics.summary.averagePurchaseCountPerUser.toFixed(1)}回
          </div>
        </div>
      </div>

      {/* グラフ */}
      {chartData.length > 0 && (
        <>
          {/* 棒グラフ */}
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-4 text-lg font-semibold">
              {groupBy === "plan" ? "プラン別購入統計" : "時系列購入統計（棒グラフ）"}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="購入回数" />
                <Bar yAxisId="right" dataKey="amount" fill="#82ca9d" name="金額（円）" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 折れ線グラフ（時系列トレンド）- 時系列集計の場合のみ */}
          {groupBy !== "plan" && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-4 text-lg font-semibold">売上推移（折れ線グラフ）</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="購入回数"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="amount"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="金額（円）"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* 詳細データテーブル */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="mb-4 text-lg font-semibold">詳細データ</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {groupBy === "plan" ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      プラン
                    </th>
                  </>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    日付
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  購入回数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  有償ポイント
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  無償ポイント
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {statistics.data.map((item, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {groupBy === "plan" ? item.planLabel || "プラン不明" : item.date || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {item.count.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    ¥{item.totalAmount.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-blue-600">
                    {item.totalPaidPoints.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-purple-600">
                    {item.totalFreePoints.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
