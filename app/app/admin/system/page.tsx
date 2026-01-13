'use client';

import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート
const ActionHistoryContent = dynamic(() => import('@/app/admin/action-history/page'), { ssr: false });

export default function SystemGroupPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'action-history';

  return (
    <AdminLayout>
      <TabbedPage
        title="システム"
        defaultTab={defaultTab}
        tabs={[
          {
            id: 'action-history',
            label: '操作履歴',
            icon: '📋',
            content: <ActionHistoryContent />,
          },
        ]}
      />
    </AdminLayout>
  );
}
