'use client';

import { useState } from 'react';
import GachaMenu from './GachaMenu';
import GachaContent from './GachaContent';

export type GachaType = {
  id: string;
  name: string;
  description: string;
  price: number; // 価格（円）
};

const gachaTypes: GachaType[] = [
  {
    id: 'normal',
    name: '通常ガチャ',
    description: '基本的なガチャです',
    price: 100, // 100円
  },
  {
    id: 'premium',
    name: 'プレミアムガチャ',
    description: 'レアアイテムが出やすいガチャです',
    price: 300, // 300円
  },
];

export default function GachaModal({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const [selectedGacha, setSelectedGacha] = useState<GachaType>(gachaTypes[0]);

  if (!isOpen) return null;

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
          />
        </div>
      </div>
    </div>
  );
}


