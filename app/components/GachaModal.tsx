'use client';

import { useState, useEffect } from 'react';
import GachaMenu from './GachaMenu';
import GachaContent from './GachaContent';

export type GachaType = {
  id: string;
  name: string;
  description: string | null;
  pointCost: number; // ポイントコスト
};

export default function GachaModal({
  isOpen,
  onClose,
  userId,
  currentPoints,
  onPointsUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPoints?: number;
  onPointsUpdated?: (newPoints: number) => void;
}) {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedGacha, setSelectedGacha] = useState<GachaType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchGachaTypes();
    }
  }, [isOpen]);

  const fetchGachaTypes = async () => {
    try {
      const res = await fetch('/api/gacha/types');
      if (res.ok) {
        const data = await res.json();
        const activeGachaTypes = data.gachaTypes
          .filter((gt: any) => gt.isActive)
          .map((gt: any) => ({
            id: gt.id,
            name: gt.name,
            description: gt.description,
            pointCost: gt.pointCost || 0,
          }));
        setGachaTypes(activeGachaTypes);
        if (activeGachaTypes.length > 0) {
          setSelectedGacha(activeGachaTypes[0]);
        }
      }
    } catch (error) {
      console.error('ガチャタイプ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="text-center text-white">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!selectedGacha || gachaTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="text-center text-white">
          <div className="mb-4 text-lg">利用可能なガチャがありません</div>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-600 px-6 py-2 text-white"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex bg-black bg-opacity-70"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* 全画面オーバーレイ */}
      <div className="flex h-full w-full">
        {/* 左側メニュー - ポーカーテーブル風 */}
        <div className="w-1/4 bg-gradient-to-b from-green-900 via-green-800 to-green-900 text-white shadow-2xl">
          <GachaMenu
            gachaTypes={gachaTypes}
            selectedGacha={selectedGacha}
            onSelect={setSelectedGacha}
          />
        </div>

        {/* 右側メインコンテンツ - ポーカーテーブル風 */}
        <div className="flex-1 bg-gradient-to-br from-green-900 via-green-800 to-green-900">
          <GachaContent
            selectedGacha={selectedGacha}
            userId={userId}
            onClose={onClose}
            currentPoints={currentPoints}
            onPointsUpdated={onPointsUpdated}
          />
        </div>
      </div>
    </div>
  );
}


