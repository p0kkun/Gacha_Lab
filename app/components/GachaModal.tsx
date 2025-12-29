'use client';

import { useState, useEffect } from 'react';
import GachaMenu from './GachaMenu';
import GachaContent from './GachaContent';
import PointDisplay from './PointDisplay';

export type GachaType = {
  id: string;
  name: string;
  description: string;
  iconImageUrl?: string | null;
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pointBalances, setPointBalances] = useState<{
    paid: number;
    free: number;
    total: number;
    paidExpiresAt: string | null;
    freeExpiresAt: string | null;
    lastUpdated: string | null;
  } | null>(null);

  // ガチャタイプ一覧とポイント残高を取得
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          // ガチャタイプ一覧を取得
          const typesRes = await fetch('/api/gacha/types');
          if (typesRes.ok) {
            const typesData = await typesRes.json();
            setGachaTypes(typesData.gachaTypes || []);
            if (typesData.gachaTypes && typesData.gachaTypes.length > 0) {
              setSelectedGacha(typesData.gachaTypes[0]);
            }
          }

          // ポイント残高を取得
          const pointsRes = await fetch(`/api/points/balance?userId=${userId}`);
          if (pointsRes.ok) {
            const pointsData = await pointsRes.json();
            setPointBalances({
              paid: pointsData.paid || 0,
              free: pointsData.free || 0,
              total: pointsData.total || 0,
              paidExpiresAt: pointsData.paidExpiresAt,
              freeExpiresAt: pointsData.freeExpiresAt,
              lastUpdated: pointsData.lastUpdated,
            });
          }
        } catch (error) {
          console.error('データ取得エラー:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
        <div className="text-center text-gray-900">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!selectedGacha || gachaTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
        <div className="text-center text-gray-900">
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

  const handleGachaSelect = (gacha: GachaType) => {
    setSelectedGacha(gacha);
    setIsMenuOpen(false); // 選択したらメニューを閉じる
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-white bg-opacity-70 backdrop-blur-sm">
      {/* 全画面オーバーレイ */}
      <div className="flex h-full w-full flex-col">
        {/* 上部: ポイント表示とメニューボタン */}
        {pointBalances && (
          <div className="border-b border-gray-300 bg-gray-50 px-6 py-2.5">
            <div className="flex items-center justify-between">
              <PointDisplay
                pointBalances={pointBalances}
                displayMode="separated"
                showExpiry={false}
                size="small"
              />
              {/* ガチャ選択ボタン */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>ガチャ選択</span>
              </button>
            </div>
          </div>
        )}
        
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden">
          <GachaContent
            selectedGacha={selectedGacha}
            userId={userId}
            onClose={onClose}
            onPointsUpdated={async (newPoints) => {
              // ポイント残高を再取得
              try {
                const res = await fetch(`/api/points/balance?userId=${userId}`);
                if (res.ok) {
                  const data = await res.json();
                  setPointBalances({
                    paid: data.paid || 0,
                    free: data.free || 0,
                    total: data.total || 0,
                    paidExpiresAt: data.paidExpiresAt,
                    freeExpiresAt: data.freeExpiresAt,
                    lastUpdated: data.lastUpdated,
                  });
                }
              } catch (error) {
                console.error('ポイント残高取得エラー:', error);
              }
            }}
          />
        </div>
      </div>

      {/* ガチャ選択メニュー（オーバーレイ） */}
      <>
        {/* 半透明背景（フェードイン） */}
        <div
          className={`fixed inset-0 z-[60] bg-white backdrop-blur-sm transition-opacity duration-300 ease-out ${
            isMenuOpen ? 'opacity-70' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* メニューパネル（スライドイン） */}
        <div 
          className={`fixed inset-y-0 left-0 z-[70] w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <GachaMenu
            gachaTypes={gachaTypes}
            selectedGacha={selectedGacha}
            onSelect={handleGachaSelect}
            onClose={() => setIsMenuOpen(false)}
          />
        </div>
      </>
    </div>
  );
}


