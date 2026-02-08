'use client';

import Link from 'next/link';
import BottomNavigation from './BottomNavigation';

export default function HelpPage() {
  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#e9dacb' }}>
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg p-6 shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
          <h1 className="text-2xl font-bold" style={{ color: '#4a3a2a' }}>ヘルプ・お知らせ</h1>
        </div>

        {/* メニュー */}
        <div className="space-y-4">
          <div className="rounded-lg p-4 shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: '#4a3a2a' }}>
              規約関連
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/terms" className="text-blue-700 hover:text-blue-900 hover:underline">
                サービス利用規約
              </Link>
              <Link href="/privacy" className="text-blue-700 hover:text-blue-900 hover:underline">
                プライバシーポリシー
              </Link>
              <Link href="/commercial-transaction" className="text-blue-700 hover:text-blue-900 hover:underline">
                特定商取引法に基づく表記
              </Link>
              <Link href="/compensation-policy" className="text-blue-700 hover:text-blue-900 hover:underline">
                課金トラブル時の補填ポリシー
              </Link>
            </div>
          </div>
        </div>

      </div>
      <BottomNavigation />
    </div>
  );
}
