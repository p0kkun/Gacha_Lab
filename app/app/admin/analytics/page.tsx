'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート
const MessagesContent = dynamic(() => import('@/app/admin/messages/page'), { ssr: false });
const StatisticsContent = dynamic(() => import('@/app/admin/statistics/page'), { ssr: false });

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'messages';

  return (
    <TabbedPage
      title="配信・統計"
      defaultTab={defaultTab}
      tabs={[
        {
          id: 'messages',
          label: 'メッセージ配信',
          icon: '💬',
          content: <MessagesContent />,
        },
        {
          id: 'statistics',
          label: '統計・購入状況',
          icon: '📈',
          content: <StatisticsContent />,
        },
      ]}
    />
  );
}

export default function AnalyticsGroupPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-gray-500">読み込み中...</div></div>}>
        <AnalyticsContent />
      </Suspense>
    </AdminLayout>
  );
}
