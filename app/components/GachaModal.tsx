'use client';

import { useState } from 'react';
import GachaMenu from './GachaMenu';
import GachaContent from './GachaContent';

export type GachaType = {
  id: string;
  name: string;
  description: string;
};

const gachaTypes: GachaType[] = [
  {
    id: 'normal',
    name: '通常ガチャ',
    description: '基本的なガチャです',
  },
  {
    id: 'premium',
    name: 'プレミアムガチャ',
    description: 'レアアイテムが出やすいガチャです',
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
  const [isShowingVideo, setIsShowingVideo] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black bg-opacity-50">
      {/* 全画面オーバーレイ */}
      <div className="flex h-full w-full">
        {/* 左側メニュー */}
        {!isShowingVideo && (
          <div className="w-1/3 bg-gray-800 text-white">
            <GachaMenu
              gachaTypes={gachaTypes}
              selectedGacha={selectedGacha}
              onSelect={setSelectedGacha}
            />
          </div>
        )}

        {/* 右側メインコンテンツ */}
        <div className={`${isShowingVideo ? 'w-full' : 'flex-1'} bg-white`}>
          <GachaContent
            selectedGacha={selectedGacha}
            userId={userId}
            onClose={onClose}
            onVideoStateChange={setIsShowingVideo}
          />
        </div>
      </div>
    </div>
  );
}


