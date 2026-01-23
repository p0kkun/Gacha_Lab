'use client';

import Link from 'next/link';
import BottomNavigation from './BottomNavigation';

export default function HelpPage() {
  return (
    <div className="min-h-screen pb-20 p-4" style={{ backgroundColor: '#e9dacb' }}>
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
          <h1 className="text-2xl font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>ヘルプ・お知らせ</h1>
        </div>

        {/* メニュー */}
        <div className="space-y-4">
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#4a3a2a' }}>サービスについて</h2>
            <p className="mb-4 text-sm" style={{ color: '#6b5a4a' }}>
              Gacha Labは、ホールデムポーカーの演出を楽しめるガチャサービスです。
              役の強さに応じてレアリティが決定され、エピック、レア、コモンの3段階でアイテムを獲得できます。
            </p>
            <Link
              href="/about"
              className="underline transition-colors"
              style={{ color: '#8b6f47' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#9b7f57';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b6f47';
              }}
              target="_blank"
            >
              詳細を見る →
            </Link>
          </div>

          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#4a3a2a' }}>利用規約</h2>
            <p className="mb-4 text-sm" style={{ color: '#6b5a4a' }}>
              サービスの利用規約をご確認ください。
            </p>
            <Link
              href="/terms"
              className="underline transition-colors"
              style={{ color: '#8b6f47' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#9b7f57';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b6f47';
              }}
              target="_blank"
            >
              利用規約を見る →
            </Link>
          </div>

          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#4a3a2a' }}>プライバシーポリシー</h2>
            <p className="mb-4 text-sm" style={{ color: '#6b5a4a' }}>
              個人情報の取り扱いについてご確認ください。
            </p>
            <Link
              href="/privacy"
              className="underline transition-colors"
              style={{ color: '#8b6f47' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#9b7f57';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b6f47';
              }}
              target="_blank"
            >
              プライバシーポリシーを見る →
            </Link>
          </div>

          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#4a3a2a' }}>
              特定商取引法に基づく表記
            </h2>
            <p className="mb-4 text-sm" style={{ color: '#6b5a4a' }}>
              特定商取引法に基づく表記をご確認ください。
            </p>
            <Link
              href="/commercial-transaction"
              className="underline transition-colors"
              style={{ color: '#8b6f47' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#9b7f57';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b6f47';
              }}
              target="_blank"
            >
              表記を見る →
            </Link>
          </div>
        </div>

      </div>
      <BottomNavigation currentPage="help" />
    </div>
  );
}


