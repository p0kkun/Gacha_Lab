'use client';

import { useState, useEffect } from 'react';
import GachaMenu from './GachaMenu';
import GachaContent from './GachaContent';

export type GachaType = {
  id: string;
  name: string;
  description: string;
  pointCost?: number;
};

export default function GachaModal({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedGacha, setSelectedGacha] = useState<GachaType | null>(null);
  const [loading, setLoading] = useState(true);

  // ガチャタイプ一覧を取得
  useEffect(() => {
    if (isOpen) {
      const fetchGachaTypes = async () => {
        try {
          const res = await fetch('/api/gacha/types');
          if (res.ok) {
            const data = await res.json();
            setGachaTypes(data.gachaTypes || []);
            if (data.gachaTypes && data.gachaTypes.length > 0) {
              setSelectedGacha(data.gachaTypes[0]);
            }
          }
        } catch (error) {
          console.error('ガチャタイプ取得エラー:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchGachaTypes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="text-center text-white">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!selectedGacha || gachaTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="text-center text-white">
          <div className="mb-4 text-lg">利用可能なガチャがありません</div>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black bg-opacity-50">
      {/* 全画面オーバーレイ */}
      <div className="flex h-full w-full">
        {/* 左側メニュー */}
        <div className="w-1/4 bg-gray-800 text-white">
          <GachaMenu
            gachaTypes={gachaTypes}
            selectedGacha={selectedGacha}
            onSelect={setSelectedGacha}
          />
        </div>

        {/* 右側メインコンテンツ */}
        <div className="flex-1 bg-white">
          <GachaContent
            selectedGacha={selectedGacha}
            userId={userId}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}


