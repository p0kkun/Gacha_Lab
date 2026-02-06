'use client';

import { useState, useEffect } from 'react';
import { Button, Select, Card, Alert } from '@/components/admin/ui';

type GachaType = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
};

type PickupSettings = {
  pickupGachaId: number | null;
  pickupGacha: GachaType | null;
};

export default function PickupSettingsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [pickupSettings, setPickupSettings] = useState<PickupSettings | null>(null);
  const [selectedGachaId, setSelectedGachaId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ガチャタイプ一覧を取得
      const gachaTypesRes = await fetch('/api/admin/gacha-types', {
        headers: {},
      });
      if (!gachaTypesRes.ok) {
        throw new Error('ガチャタイプ一覧の取得に失敗しました');
      }
      const gachaTypesData = await gachaTypesRes.json();
      // APIレスポンスの構造を確認して、配列を安全に設定
      let types: GachaType[] = [];
      if (gachaTypesData && typeof gachaTypesData === 'object') {
        if (Array.isArray(gachaTypesData.gachaTypes)) {
          types = gachaTypesData.gachaTypes;
        } else if (Array.isArray(gachaTypesData)) {
          types = gachaTypesData;
        }
      }
      // エラーが発生しても空配列を設定して、undefinedを防ぐ
      setGachaTypes(types);

      // ピックアップ設定を取得
      const pickupRes = await fetch('/api/admin/pickup', {
        headers: {},
      });
      if (!pickupRes.ok) {
        throw new Error('ピックアップ設定の取得に失敗しました');
      }
      const pickupData = await pickupRes.json();
      setPickupSettings(pickupData);
      setSelectedGachaId(pickupData.pickupGachaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      // エラーが発生した場合でも、gachaTypesを空配列に設定してundefinedを防ぐ
      setGachaTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/admin/pickup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupGachaId: selectedGachaId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ピックアップ設定の更新に失敗しました');
      }

      const data = await res.json();
      setPickupSettings(data);
      setSuccess('ピックアップガチャ設定を更新しました');
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const getGachaStatus = (gacha: GachaType): string => {
    const now = new Date();
    if (!gacha.isActive) {
      return '無効';
    }
    if (gacha.startAt && new Date(gacha.startAt) > now) {
      return '開始前';
    }
    if (gacha.endAt && new Date(gacha.endAt) < now) {
      return '終了';
    }
    return '公開中';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">ピックアップガチャ設定</h2>
          <p className="mt-1 text-sm text-gray-600">
            リッチメニューの「ガチャ①」からアクセスされるピックアップガチャを設定します。
            <br />
            設定後、<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/pickup</code> にアクセスすると、設定されたガチャが表示されます。
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            {success}
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ピックアップガチャ
            </label>
            <Select
              value={selectedGachaId?.toString() || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedGachaId(value ? parseInt(value, 10) : null);
              }}
              options={
                Array.isArray(gachaTypes) && gachaTypes.length > 0
                  ? [
                      { value: '', label: '未設定（一覧へ誘導）' },
                      ...gachaTypes
                        .filter((gacha) => gacha && gacha.id)
                        .map((gacha) => {
                          const status = getGachaStatus(gacha);
                          return {
                            value: gacha.id.toString(),
                            label: `${gacha.name || '無名'} (${gacha.code || 'N/A'}) - ${status}` };
                        }),
                    ]
                  : [{ value: '', label: 'ガチャタイプがありません' }]
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              選択したガチャが無効化されたり期間外になった場合、自動的に一覧へ誘導されます。
            </p>
          </div>

          {pickupSettings?.pickupGacha && (
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                現在の設定
              </h3>
              <div className="text-sm text-blue-800">
                <p>
                  <span className="font-medium">ガチャ名:</span> {pickupSettings.pickupGacha.name}
                </p>
                <p>
                  <span className="font-medium">コード:</span> {pickupSettings.pickupGacha.code}
                </p>
                <p>
                  <span className="font-medium">状態:</span> {getGachaStatus(pickupSettings.pickupGacha)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="primary"
            >
              {saving ? '保存中...' : '保存'}
            </Button>
            <Button
              onClick={fetchData}
              disabled={loading || saving}
              variant="secondary"
            >
              再読み込み
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h3 className="text-md font-semibold text-gray-800">使い方</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>上記のセレクトボックスからピックアップガチャを選択します</li>
            <li>「保存」ボタンをクリックして設定を保存します</li>
            <li>リッチメニューの「ガチャ①」のリンク先を <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/pickup</code> に設定します</li>
            <li>ユーザーが <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/pickup</code> にアクセスすると、設定されたガチャが表示されます</li>
            <li>ピックアップを変更する場合は、この画面で再度選択して保存するだけです（デプロイ不要）</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
