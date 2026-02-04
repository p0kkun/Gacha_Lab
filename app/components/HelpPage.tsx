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
        </div>

      </div>
      <BottomNavigation />
    </div>
  );
}
