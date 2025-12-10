'use client';

import { GachaType } from './GachaModal';

export default function GachaMenu({
  gachaTypes,
  selectedGacha,
  onSelect,
}: {
  gachaTypes: GachaType[];
  selectedGacha: GachaType;
  onSelect: (gacha: GachaType) => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 border-b border-green-600 pb-4">
        <h2 className="text-2xl font-bold text-yellow-300 drop-shadow-lg">🎰 ガチャ選択</h2>
        <p className="mt-2 text-sm text-green-200">ポーカーテーブル</p>
      </div>
      <ul className="space-y-4">
        {gachaTypes.map((gacha) => (
          <li key={gacha.id}>
            <button
              onClick={() => onSelect(gacha)}
              className={`group relative w-full overflow-hidden rounded-xl p-4 text-left transition-all duration-300 ${
                selectedGacha.id === gacha.id
                  ? 'scale-105 bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700 text-white shadow-2xl ring-4 ring-yellow-400 ring-opacity-50'
                  : 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 text-gray-200 shadow-lg hover:scale-105 hover:bg-gradient-to-br hover:from-gray-700 hover:via-gray-600 hover:to-gray-700'
              }`}
            >
              {/* カード風の装飾 */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white opacity-5"></div>
              
              {/* スーツアイコン */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl">
                  {selectedGacha.id === gacha.id ? '🂡' : '🂠'}
                </span>
                <div className={`font-bold ${selectedGacha.id === gacha.id ? 'text-white' : 'text-yellow-300'}`}>
                  {gacha.name}
                </div>
              </div>
              
              <div className={`text-xs ${selectedGacha.id === gacha.id ? 'text-yellow-100' : 'text-green-300'}`}>
                {gacha.description}
              </div>
              
              {/* 選択時の光るエフェクト */}
              {selectedGacha.id === gacha.id && (
                <div className="absolute inset-0 animate-pulse rounded-xl bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-20"></div>
              )}
            </button>
          </li>
        ))}
      </ul>
      
      {/* 装飾的な要素 */}
      <div className="mt-8 text-center">
        <div className="text-4xl text-green-700 opacity-30">♠ ♥ ♦ ♣</div>
      </div>
    </div>
  );
}


