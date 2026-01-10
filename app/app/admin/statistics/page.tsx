'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type GachaStat = {
  gachaTypeId: number;
  gachaTypeName: string;
  count: number;
  uniqueUserCount: number;
  totalPointsUsed: number;
  pointCost: number;
};

type ItemUsageStat = {
  itemId: number;
  itemName: string;
  rarity: string;
  isActive: boolean;
  ownershipCount: number;
  ownershipRate: number;
  usageCount: number;
  usageRate: number;
};

type Statistics = {
  period: string;
  startDate: string;
  endDate?: string;
  totalUsers: number;
  totalGachaCount: number;
  gachaStats: GachaStat[];
  rarityStats: Record<string, number>;
  dailyStats: Array<{ date: string; count: number }>;
  itemUsageStats?: ItemUsageStat[];
};

const RARITY_LABELS: Record<string, string> = {
  FIRST_PRIZE: '1等',
  SECOND_PRIZE: '2等',
  THIRD_PRIZE: '3等',
  FOURTH_PRIZE: '4等',
  FIFTH_PRIZE: '5等',
  LOSER: 'ハズレ',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type GachaTypeOption = {
  id: number; // 内部ID（DB）
  code: string; // 外部参照用コード（例: "normal"）
  name: string;
  isActive: boolean;
};

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'selected'>('all');
  // NOTE: 外部指定は code を扱う（API/URLの互換のため変数名は維持）
  const [selectedGachaTypeIds, setSelectedGachaTypeIds] = useState<string[]>([]);
  const [gachaTypeOptions, setGachaTypeOptions] = useState<GachaTypeOption[]>([]);
  const [showGachaChart, setShowGachaChart] = useState(false);
  const [showRarityChart, setShowRarityChart] = useState(false);
  const [showDailyChart, setShowDailyChart] = useState(false);

  useEffect(() => {
    fetchGachaTypeOptions();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [period, startDate, endDate, filterType, selectedGachaTypeIds]);

  const fetchGachaTypeOptions = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/gacha-types', {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setGachaTypeOptions(data.gachaTypes);
      }
    } catch (error) {
      console.error('ガチャタイプ取得エラー:', error);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      params.append('filterType', filterType);
      if (filterType === 'selected' && selectedGachaTypeIds.length > 0) {
        params.append('gachaTypeIds', selectedGachaTypeIds.join(','));
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/statistics?${params}`, {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        throw new Error('統計情報の取得に失敗しました');
      }

      const data = await res.json();
      setStatistics(data);
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      setError('統計情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!statistics) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            統計情報の取得に失敗しました
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="mb-4 text-xl font-bold text-gray-800 lg:mb-6 lg:text-2xl">統計・購入状況</h1>
          
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          
          {/* 期間選択とガチャ絞り込み */}
          <div className="mb-4 flex flex-wrap items-start gap-4">
            {/* 期間選択 */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as 'day' | 'month' | 'custom');
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="day">今日</option>
                <option value="month">今月</option>
                <option value="custom">期間指定</option>
              </select>
              {period === 'custom' && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="開始日"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="終了日"
                  />
                </>
              )}
            </div>

            {/* ガチャ絞り込み */}
            <div className="flex flex-wrap items-start gap-3">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as 'all' | 'active' | 'inactive' | 'selected');
                  if (e.target.value !== 'selected') {
                    setSelectedGachaTypeIds([]);
                  }
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="all">すべてのガチャ</option>
                <option value="active">現行で稼働しているもののみ</option>
                <option value="inactive">過去のものすべて</option>
                <option value="selected">選択したガチャのみ</option>
              </select>
              
              {filterType === 'selected' && (
                <div className="min-w-[320px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ガチャを選択（複数選択可）
                  </label>
                  <div className="max-h-[200px] overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-sm">
                    {gachaTypeOptions.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-500">
                        ガチャタイプがありません
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {gachaTypeOptions.map((gachaType) => {
                          const isSelected = selectedGachaTypeIds.includes(gachaType.code);
                          return (
                            <label
                              key={gachaType.id}
                              className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGachaTypeIds([
                                      ...selectedGachaTypeIds,
                                      gachaType.code,
                                    ]);
                                  } else {
                                    setSelectedGachaTypeIds(
                                      selectedGachaTypeIds.filter(
                                        (id) => id !== gachaType.code
                                      )
                                    );
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="flex-1 text-gray-900">{gachaType.name}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  gachaType.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {gachaType.isActive ? '稼働中' : '停止中'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {selectedGachaTypeIds.length > 0 && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-800">
                          選択中: {selectedGachaTypeIds.length}個
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedGachaTypeIds([])}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          すべて解除
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedGachaTypeIds.map((id) => {
                          const gachaType = gachaTypeOptions.find(
                            (gt) => gt.code === id
                          );
                          return gachaType ? (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 shadow-sm"
                            >
                              {gachaType.name}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGachaTypeIds(selectedGachaTypeIds.filter((gid) => gid !== id));
                                }}
                                className="ml-0.5 rounded-full bg-blue-200 px-1.5 py-0.5 text-blue-700 hover:bg-blue-300 transition-colors"
                                aria-label="削除"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* サマリー */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-500">総ユーザー数</div>
            <div className="mt-2 text-3xl font-bold text-gray-800">
              {statistics.totalUsers.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-500">
              {period === 'day' ? '今日の' : period === 'month' ? '今月の' : '期間中の'}ガチャ実行回数
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-800">
              {statistics.totalGachaCount.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-500">期間</div>
            <div className="mt-2 text-lg font-semibold text-gray-800">
              {new Date(statistics.startDate).toLocaleDateString('ja-JP')} ～
              {statistics.endDate ? new Date(statistics.endDate).toLocaleDateString('ja-JP') : '現在'}
            </div>
          </div>
        </div>

        {/* ガチャ購入状況 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">ガチャ購入状況</h2>
            <button
              onClick={() => setShowGachaChart(!showGachaChart)}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              {showGachaChart ? '一覧表示' : 'グラフ表示'}
            </button>
          </div>
          
          {showGachaChart ? (
            <div className="space-y-6">
              {/* ガチャタイプ別実行回数 */}
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-700">ガチャタイプ別実行回数</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statistics.gachaStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="gachaTypeName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="実行回数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ガチャタイプ別課金人数 */}
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-700">ガチャタイプ別課金人数</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statistics.gachaStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="gachaTypeName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="uniqueUserCount" fill="#10b981" name="課金人数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ガチャタイプ別消費ポイント */}
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-700">ガチャタイプ別消費ポイント</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statistics.gachaStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="gachaTypeName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalPointsUsed" fill="#f59e0b" name="消費ポイント" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ガチャ名</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">実行回数</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">課金人数</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">消費ポイント</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">1回あたり</th>
                </tr>
              </thead>
              <tbody>
                {statistics.gachaStats.map((stat) => (
                  <tr key={stat.gachaTypeId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{stat.gachaTypeName}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {stat.count.toLocaleString()} 回
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {stat.uniqueUserCount.toLocaleString()} 人
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                      {stat.totalPointsUsed.toLocaleString()} pt
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {stat.pointCost > 0 ? `${stat.pointCost} pt` : '無料'}
                    </td>
                  </tr>
                ))}
                {statistics.gachaStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* ガチャタイプ別統計（簡易版） */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">ガチャタイプ別実行回数</h2>
          <div className="space-y-2">
            {statistics.gachaStats.map((stat) => (
              <div key={stat.gachaTypeId} className="flex items-center justify-between">
                <span className="text-gray-700">{stat.gachaTypeName}</span>
                <span className="text-lg font-semibold text-gray-800">
                  {stat.count.toLocaleString()} 回
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* レアリティ別統計 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">レアリティ別獲得数</h2>
            <button
              onClick={() => setShowRarityChart(!showRarityChart)}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              {showRarityChart ? '一覧表示' : 'グラフ表示'}
            </button>
          </div>
          
          {showRarityChart ? (
            <div>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={Object.entries(statistics.rarityStats).map(([rarity, count]) => ({
                      name: RARITY_LABELS[rarity] || rarity,
                      value: count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(1) : '0.0'}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(statistics.rarityStats).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Object.entries(statistics.rarityStats).map(([rarity, count]) => (
                <div key={rarity} className="rounded-md bg-gray-50 p-3">
                  <div className="text-sm text-gray-500">{RARITY_LABELS[rarity] || rarity}</div>
                  <div className="text-lg font-semibold">{count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 日別統計 */}
        {statistics.dailyStats.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">日別実行回数</h2>
              <button
                onClick={() => setShowDailyChart(!showDailyChart)}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                {showDailyChart ? '一覧表示' : 'グラフ表示'}
              </button>
            </div>
            
            {showDailyChart ? (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={statistics.dailyStats.map((stat) => {
                      const date = new Date(stat.date);
                      return {
                        date: `${date.getMonth() + 1}/${date.getDate()}`,
                        fullDate: stat.date,
                        count: stat.count,
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number | undefined) => [`${value ?? 0} 回`, '実行回数']}
                      labelFormatter={(label) => {
                        const date = statistics.dailyStats.find((s) => {
                          const d = new Date(s.date);
                          return `${d.getMonth() + 1}/${d.getDate()}` === label;
                        });
                        return date ? new Date(date.date).toLocaleDateString('ja-JP') : label;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="実行回数"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-2">
                {statistics.dailyStats
                  .filter((stat) => stat.count > 0) // データがある日だけ表示
                  .map((stat) => (
                    <div key={stat.date} className="flex items-center justify-between">
                      <span className="text-gray-700">
                        {new Date(stat.date).toLocaleDateString('ja-JP')}
                      </span>
                      <span className="text-lg font-semibold text-gray-800">
                        {stat.count.toLocaleString()} 回
                      </span>
                    </div>
                  ))}
                {statistics.dailyStats.filter((stat) => stat.count > 0).length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    データがありません
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* アイテム使用状況 */}
        {statistics.itemUsageStats && statistics.itemUsageStats.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">アイテム使用状況</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">アイテム名</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">レアリティ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">所持数</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">所持率</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">使用数</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">使用率</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.itemUsageStats.map((item) => (
                    <tr key={item.itemId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {RARITY_LABELS[item.rarity] || item.rarity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {item.ownershipCount.toLocaleString()}人
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {item.ownershipRate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {item.usageCount.toLocaleString()}回
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {item.usageRate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {item.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            有効
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            無効
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


