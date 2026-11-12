import { createFileRoute } from '@tanstack/react-router';

import { AdminQualityPage } from '@/features/admin/AdminQualityPage';

export const Route = createFileRoute('/_admin/admin/quality')({
  component: AdminQualityRoute,
});

function AdminQualityRoute() {
  return <AdminQualityPage />;
}
