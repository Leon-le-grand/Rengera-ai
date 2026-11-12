import { createFileRoute } from '@tanstack/react-router';

import { CAPABILITIES } from '@/auth/capabilities';
import { requireCapability } from '@/auth/guards';
import { AdminStaffPage } from '@/features/admin/AdminStaffPage';

export const Route = createFileRoute('/_admin/admin/staff')({
  beforeLoad: async ({ context, location }) =>
    requireCapability(context.auth, { href: location.href }, CAPABILITIES.staffManage),
  component: AdminStaffRoute,
});

function AdminStaffRoute() {
  return <AdminStaffPage />;
}
