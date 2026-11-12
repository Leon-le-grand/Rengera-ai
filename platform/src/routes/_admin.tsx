import { createFileRoute, Outlet } from '@tanstack/react-router';

import { requireOperationsAccess } from '@/auth/guards';
import { AdminLayout } from '@/components/layout/AdminLayout';

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ context, location }) =>
    requireOperationsAccess(context.auth, {
      href: location.href,
    }),
  component: AdminRouteLayout,
});

function AdminRouteLayout() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
