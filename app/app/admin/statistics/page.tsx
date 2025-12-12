'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type GachaStat = {
  gachaTypeId: string;
  gachaTypeName: string;
  count: number;
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
};

const RARITY_LABELS: Record<string, string> = {
  FIRST_PRIZE: '1等',
  SECOND_PRIZE: '2等',
  THIRD_PRIZE: '3等',
  FOURTH_PRIZE: '4等',
  FIFTH_PRIZE: '5等',
  LOSER: 'ハズレ',
};

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, [period, startDate, endDate]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
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
      alert('統計情報の取得に失敗しました');
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
          
          {/* 期間選択 */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as 'day' | 'month' | 'custom');
                if (e.target.value !== 'custom') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="開始日"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="終了日"
                />
              </>
            )}
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

        {/* ガチャタイプ別統計 */}
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
          <h2 className="mb-4 text-xl font-semibold text-gray-800">レアリティ別獲得数</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Object.entries(statistics.rarityStats).map(([rarity, count]) => (
              <div key={rarity} className="rounded-md bg-gray-50 p-3">
                <div className="text-sm text-gray-500">{RARITY_LABELS[rarity] || rarity}</div>
                <div className="text-lg font-semibold">{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 日別統計 */}
        {statistics.dailyStats.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">日別実行回数</h2>
            <div className="space-y-2">
              {statistics.dailyStats.map((stat) => (
                <div key={stat.date} className="flex items-center justify-between">
                  <span className="text-gray-700">
                    {new Date(stat.date).toLocaleDateString('ja-JP')}
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {stat.count.toLocaleString()} 回
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


