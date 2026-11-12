import { createFileRoute } from '@tanstack/react-router';

import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminOverviewRoute,
});

function AdminOverviewRoute() {
  return <AdminOverviewPage />;
}
