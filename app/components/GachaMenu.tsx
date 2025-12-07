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
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-4 text-lg font-bold">ガチャ選択</h2>
      <ul className="space-y-2">
        {gachaTypes.map((gacha) => (
          <li key={gacha.id}>
            <button
              onClick={() => onSelect(gacha)}
              className={`w-full overflow-hidden rounded-lg p-3 text-left transition-colors ${
                selectedGacha.id === gacha.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              <div className="truncate font-semibold">{gacha.name}</div>
              <div className="truncate text-xs opacity-80">{gacha.description}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


