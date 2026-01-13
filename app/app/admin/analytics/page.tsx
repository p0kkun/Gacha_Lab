'use client';

import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート
const MessagesContent = dynamic(() => import('@/app/admin/messages/page'), { ssr: false });
const StatisticsContent = dynamic(() => import('@/app/admin/statistics/page'), { ssr: false });

export default function AnalyticsGroupPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'messages';

  return (
    <AdminLayout>
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
    </AdminLayout>
  );
}
