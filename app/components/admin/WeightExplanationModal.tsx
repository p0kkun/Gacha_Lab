'use client';

import Modal from './ui/Modal';

type WeightExplanationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
};

export default function WeightExplanationModal({
  isOpen,
  onClose,
  title = '重みによる抽選の仕組み',
}: WeightExplanationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="large">
      <div className="space-y-6">
        {/* 基本説明 */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">重みとは？</h3>
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
            <p className="mb-2">
              <strong>重み</strong>は、各等級や景品の「当たりやすさ」を表す数値です。
            </p>
            <p className="mb-2">
              <strong className="text-blue-700">重要なポイント：</strong>
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>重みの合計を100にする必要はありません</li>
              <li>重みの比率が確率を決定します</li>
              <li>例：重みが 10, 20, 30 の場合、確率は 16.7%, 33.3%, 50% になります</li>
            </ul>
          </div>
        </div>

        {/* 図解：抽選の流れ */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">抽選の流れ</h3>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* ステップ1 */}
            <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  1
                </div>
                <h4 className="font-semibold text-gray-800">等級の抽選</h4>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-sm text-gray-700">
                  まず、等級（1等、2等など）を重みに基づいて抽選します。
                </p>
                <div className="rounded bg-gray-50 p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-600">例：等級の重み設定</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1">
                      <span>1等</span>
                      <span className="font-mono font-semibold text-blue-600">重み: 10</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1">
                      <span>2等</span>
                      <span className="font-mono font-semibold text-blue-600">重み: 20</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1">
                      <span>3等</span>
                      <span className="font-mono font-semibold text-blue-600">重み: 30</span>
                    </div>
                    <div className="mt-2 border-t pt-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">合計</span>
                        <span className="font-mono font-semibold">60</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-800">
                  <strong>確率の計算：</strong>
                  <div className="mt-1 space-y-0.5">
                    <div>1等: 10 ÷ 60 = 16.7%</div>
                    <div>2等: 20 ÷ 60 = 33.3%</div>
                    <div>3等: 30 ÷ 60 = 50.0%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ステップ2 */}
            <div className="flex items-center justify-center">
              <div className="text-2xl text-gray-400">↓</div>
            </div>

            <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                  2
                </div>
                <h4 className="font-semibold text-gray-800">景品の抽選</h4>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-sm text-gray-700">
                  抽選された等級内で、景品を重みに基づいて抽選します。
                </p>
                <div className="rounded bg-gray-50 p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-600">
                    例：2等が選ばれた場合（2等内の景品の重み）
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1">
                      <span>景品A</span>
                      <span className="font-mono font-semibold text-green-600">重み: 5</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1">
                      <span>景品B</span>
                      <span className="font-mono font-semibold text-green-600">重み: 15</span>
                    </div>
                    <div className="mt-2 border-t pt-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">合計</span>
                        <span className="font-mono font-semibold">20</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 rounded bg-green-50 p-2 text-xs text-green-800">
                  <strong>確率の計算：</strong>
                  <div className="mt-1 space-y-0.5">
                    <div>景品A: 5 ÷ 20 = 25%</div>
                    <div>景品B: 15 ÷ 20 = 75%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ステップ3 */}
            <div className="flex items-center justify-center">
              <div className="text-2xl text-gray-400">↓</div>
            </div>

            <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                  3
                </div>
                <h4 className="font-semibold text-gray-800">最終確率</h4>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-sm text-gray-700">
                  最終的な景品の確率は、等級確率 × 等級内確率で計算されます。
                </p>
                <div className="rounded bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-600">最終確率の例</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between rounded bg-purple-50 px-2 py-1">
                      <span>2等 × 景品A</span>
                      <span className="font-mono font-semibold text-purple-600">
                        33.3% × 25% = 8.3%
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-purple-50 px-2 py-1">
                      <span>2等 × 景品B</span>
                      <span className="font-mono font-semibold text-purple-600">
                        33.3% × 75% = 25.0%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 重要なポイント */}
        <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-yellow-800">重要なポイント</h3>
          <ul className="space-y-2 text-sm text-yellow-900">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">✓</span>
              <span>
                <strong>重みの合計を100にする必要はありません。</strong>
                重みの比率が確率を決定するため、10, 20, 30 でも 1, 2, 3 でも同じ確率になります。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">✓</span>
              <span>
                <strong>重みは相対的な値です。</strong>
                他の等級や景品との比率で確率が決まります。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">✓</span>
              <span>
                <strong>重みを変更すると、自動的に確率が再計算されます。</strong>
                画面に表示される「現在の確率」を確認しながら設定してください。
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
