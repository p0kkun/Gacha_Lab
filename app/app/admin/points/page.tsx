'use client';

import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート（元のページをそのまま使用）
const PointsManagementContent = dynamic(() => import('@/app/admin/points/points-management'), { ssr: false });
const PointPlansContent = dynamic(() => import('@/app/admin/point-plans/page'), { ssr: false });

export default function PointsManagementGroupPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'points';

  return (
    <AdminLayout>
      <TabbedPage
        title="ポイント管理"
        defaultTab={defaultTab}
        tabs={[
          {
            id: 'points',
            label: 'ポイント管理',
            icon: '💰',
            content: <PointsManagementContent />,
          },
          {
            id: 'point-plans',
            label: 'ポイント購入プラン',
            icon: '💳',
            content: <PointPlansContent />,
          },
        ]}
      />
    </AdminLayout>
  );
}
