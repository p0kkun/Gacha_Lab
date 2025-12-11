'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type HandRank = 
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'ONE_PAIR'
  | 'HIGH_CARD';

const handRankOptions: { value: HandRank; label: string }[] = [
  { value: 'ROYAL_FLUSH', label: 'ロイヤルフラッシュ' },
  { value: 'STRAIGHT_FLUSH', label: 'ストレートフラッシュ' },
  { value: 'FOUR_OF_A_KIND', label: 'フォーカード' },
  { value: 'FULL_HOUSE', label: 'フルハウス' },
  { value: 'FLUSH', label: 'フラッシュ' },
  { value: 'STRAIGHT', label: 'ストレート' },
  { value: 'THREE_OF_A_KIND', label: 'スリーカード' },
  { value: 'TWO_PAIR', label: 'ツーペア' },
  { value: 'ONE_PAIR', label: 'ワンペア' },
  { value: 'HIGH_CARD', label: 'ハイカード' },
];

const getHandName = (hand: HandRank | null | undefined): string => {
  if (!hand) return '未設定';
  const option = handRankOptions.find(opt => opt.value === hand);
  return option ? option.label : hand;
};

const getHandNames = (hands: HandRank[] | null | undefined): string => {
  if (!hands || hands.length === 0) return '未設定';
  return hands.map(hand => getHandName(hand)).join('、');
};

type GachaType = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  firstPrizeWeight: number;
  secondPrizeWeight: number;
  thirdPrizeWeight: number;
  fourthPrizeWeight: number;
  fifthPrizeWeight: number;
  loserWeight: number;
  firstPrizeHands: HandRank[];
  secondPrizeHands: HandRank[];
  thirdPrizeHands: HandRank[];
  fourthPrizeHands: HandRank[];
  fifthPrizeHands: HandRank[];
  createdAt: string;
  updatedAt: string;
};

export default function GachaTypesPage() {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<GachaType>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchGachaTypes();
  }, []);

  const fetchGachaTypes = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('ガチャタイプ取得エラー:', error);
      alert('ガチャタイプ一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gachaType: GachaType) => {
    setEditingId(gachaType.id);
    setFormData(gachaType);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name) {
      setError('IDと名前は必須です');
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/gacha-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify(formData),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      setSuccess('保存しました');
      setEditingId(null);
      setFormData({});
      await fetchGachaTypes();
    } catch (error) {
      console.error('保存エラー:', error);
      setError(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const calculateTotalWeight = (gachaType: GachaType): number => {
    return (
      gachaType.firstPrizeWeight +
      gachaType.secondPrizeWeight +
      gachaType.thirdPrizeWeight +
      gachaType.fourthPrizeWeight +
      gachaType.fifthPrizeWeight +
      gachaType.loserWeight
    );
  };

  const calculatePercentage = (weight: number, total: number): number => {
    if (total === 0) return 0;
    return (weight / total) * 100;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">ガチャ設定</h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : gachaTypes.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500">
            ガチャタイプがありません
          </div>
        ) : (
          <div className="space-y-6">
            {gachaTypes.map((gachaType) => {
              const isEditing = editingId === gachaType.id;
              const totalWeight = calculateTotalWeight(gachaType);
              const displayData = isEditing ? formData : gachaType;

              return (
                <div key={gachaType.id} className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {gachaType.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          gachaType.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {gachaType.isActive ? '有効' : '無効'}
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => handleEdit(gachaType)}
                          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                        >
                          編集
                        </button>
                      )}
                    </div>
                  </div>

                  {gachaType.description && (
                    <p className="mb-4 text-sm text-gray-600">{gachaType.description}</p>
                  )}

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          名前
                        </label>
                        <input
                          type="text"
                          value={displayData.name || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          説明
                        </label>
                        <textarea
                          value={displayData.description || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={displayData.isActive ?? true}
                            onChange={(e) =>
                              setFormData({ ...formData, isActive: e.target.checked })
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">有効</span>
                        </label>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              1等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.firstPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  firstPrizeWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2"
                              min="0"
                            />
                            <label className="block text-sm font-medium text-gray-700">
                              1等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={(displayData.firstPrizeHands || []).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands = displayData.firstPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          firstPrizeHands: [...currentHands, option.value],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          firstPrizeHands: currentHands.filter(h => h !== option.value),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              2等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.secondPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  secondPrizeWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2"
                              min="0"
                            />
                            <label className="block text-sm font-medium text-gray-700">
                              2等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={(displayData.secondPrizeHands || []).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands = displayData.secondPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          secondPrizeHands: [...currentHands, option.value],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          secondPrizeHands: currentHands.filter(h => h !== option.value),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              3等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.thirdPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  thirdPrizeWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2"
                              min="0"
                            />
                            <label className="block text-sm font-medium text-gray-700">
                              3等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={(displayData.thirdPrizeHands || []).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands = displayData.thirdPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          thirdPrizeHands: [...currentHands, option.value],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          thirdPrizeHands: currentHands.filter(h => h !== option.value),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              4等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.fourthPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  fourthPrizeWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2"
                              min="0"
                            />
                            <label className="block text-sm font-medium text-gray-700">
                              4等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={(displayData.fourthPrizeHands || []).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands = displayData.fourthPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          fourthPrizeHands: [...currentHands, option.value],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          fourthPrizeHands: currentHands.filter(h => h !== option.value),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              5等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.fifthPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  fifthPrizeWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2"
                              min="0"
                            />
                            <label className="block text-sm font-medium text-gray-700">
                              5等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={(displayData.fifthPrizeHands || []).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands = displayData.fifthPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          fifthPrizeHands: [...currentHands, option.value],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          fifthPrizeHands: currentHands.filter(h => h !== option.value),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              ハズレの重み
                            </label>
                            <input
                              type="number"
                              value={displayData.loserWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  loserWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2"
                              min="0"
                            />
                            <div className="rounded-md bg-gray-50 p-3">
                              <p className="text-xs text-gray-600">
                                💡 ハズレは、上位の当たり（1等〜5等）に設定されていない役すべてが対象になります。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 text-sm text-gray-600">
                        重みの合計: {totalWeight}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-md bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-700">1等</div>
                          <div className="mt-1 text-lg font-semibold text-gray-800">
                            {gachaType.firstPrizeWeight} ({calculatePercentage(gachaType.firstPrizeWeight, totalWeight).toFixed(1)}%)
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            役: <span className="font-medium">
                              {gachaType.firstPrizeHands && gachaType.firstPrizeHands.length > 0
                                ? getHandNames(gachaType.firstPrizeHands)
                                : '未設定'}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-700">2等</div>
                          <div className="mt-1 text-lg font-semibold text-gray-800">
                            {gachaType.secondPrizeWeight} ({calculatePercentage(gachaType.secondPrizeWeight, totalWeight).toFixed(1)}%)
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            役: <span className="font-medium">
                              {gachaType.secondPrizeHands && gachaType.secondPrizeHands.length > 0
                                ? getHandNames(gachaType.secondPrizeHands)
                                : '未設定'}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-700">3等</div>
                          <div className="mt-1 text-lg font-semibold text-gray-800">
                            {gachaType.thirdPrizeWeight} ({calculatePercentage(gachaType.thirdPrizeWeight, totalWeight).toFixed(1)}%)
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            役: <span className="font-medium">
                              {gachaType.thirdPrizeHands && gachaType.thirdPrizeHands.length > 0
                                ? getHandNames(gachaType.thirdPrizeHands)
                                : '未設定'}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-700">4等</div>
                          <div className="mt-1 text-lg font-semibold text-gray-800">
                            {gachaType.fourthPrizeWeight} ({calculatePercentage(gachaType.fourthPrizeWeight, totalWeight).toFixed(1)}%)
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            役: <span className="font-medium">
                              {gachaType.fourthPrizeHands && gachaType.fourthPrizeHands.length > 0
                                ? getHandNames(gachaType.fourthPrizeHands)
                                : '未設定'}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-700">5等</div>
                          <div className="mt-1 text-lg font-semibold text-gray-800">
                            {gachaType.fifthPrizeWeight} ({calculatePercentage(gachaType.fifthPrizeWeight, totalWeight).toFixed(1)}%)
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            役: <span className="font-medium">
                              {gachaType.fifthPrizeHands && gachaType.fifthPrizeHands.length > 0
                                ? getHandNames(gachaType.fifthPrizeHands)
                                : '未設定'}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-700">ハズレ</div>
                          <div className="mt-1 text-lg font-semibold text-gray-800">
                            {gachaType.loserWeight} ({calculatePercentage(gachaType.loserWeight, totalWeight).toFixed(1)}%)
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            役: <span className="font-medium">
                              {(() => {
                                // 上位の当たりに設定されている役を取得
                                const assignedHands = new Set([
                                  ...(gachaType.firstPrizeHands || []),
                                  ...(gachaType.secondPrizeHands || []),
                                  ...(gachaType.thirdPrizeHands || []),
                                  ...(gachaType.fourthPrizeHands || []),
                                  ...(gachaType.fifthPrizeHands || []),
                                ]);
                                // すべての役から、設定されている役を除外
                                const loserHands = handRankOptions
                                  .map(opt => opt.value)
                                  .filter(hand => !assignedHands.has(hand));
                                return loserHands.length > 0
                                  ? getHandNames(loserHands)
                                  : 'なし（すべての役が当たりに設定されています）';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


