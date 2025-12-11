'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type GachaType = {
  id: string;
  name: string;
};

type SimulatorResult = {
  gachaTypeId: string;
  gachaTypeName: string;
  iterations: number;
  totalWeight: number;
  results: Record<string, number>;
  actualRates: Record<string, number>;
  expectedRates: Record<string, number>;
};

const RARITY_LABELS: Record<string, string> = {
  FIRST_PRIZE: '1等',
  SECOND_PRIZE: '2等',
  THIRD_PRIZE: '3等',
  FOURTH_PRIZE: '4等',
  FIFTH_PRIZE: '5等',
  LOSER: 'ハズレ',
};

export default function SimulatorPage() {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedGachaTypeId, setSelectedGachaTypeId] = useState<string>('');
  const [iterations, setIterations] = useState<number>(10000);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGachaTypes();
  }, []);

  const fetchGachaTypes = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/gacha-types', {
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
        throw new Error('ガチャタイプ一覧の取得に失敗しました');
      }

      const data = await res.json();
      setGachaTypes(data.gachaTypes);
      if (data.gachaTypes.length > 0) {
        setSelectedGachaTypeId(data.gachaTypes[0].id);
      }
    } catch (error) {
      console.error('ガチャタイプ取得エラー:', error);
      alert('ガチャタイプ一覧の取得に失敗しました');
    }
  };

  const handleRun = async () => {
    if (!selectedGachaTypeId) {
      alert('ガチャタイプを選択してください');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/simulator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify({
          gachaTypeId: selectedGachaTypeId,
          iterations,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'シミュレータの実行に失敗しました');
      }

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('シミュレータ実行エラー:', error);
      alert(error instanceof Error ? error.message : 'シミュレータの実行に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">ガチャシミュレータ</h1>

        {/* 設定 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">シミュレーション設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ガチャタイプ</label>
              <select
                value={selectedGachaTypeId}
                onChange={(e) => setSelectedGachaTypeId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {gachaTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">実行回数</label>
              <input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value) || 10000)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                min="100"
                max="1000000"
                step="100"
              />
              <p className="mt-1 text-xs text-gray-500">
                100 ～ 1,000,000 回の範囲で指定できます
              </p>
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '実行中...' : 'シミュレーション実行'}
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
              実行回数: {result.iterations.toLocaleString()} 回 / 重みの合計: {result.totalWeight}
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
                        {RARITY_LABELS[rarity] || rarity}
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
                            Math.abs(result.actualRates[rarity] - result.expectedRates[rarity]) <
                            0.5
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {(
                            result.actualRates[rarity] - result.expectedRates[rarity]
                          ).toFixed(2)}
                          %
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
    </AdminLayout>
  );
}


