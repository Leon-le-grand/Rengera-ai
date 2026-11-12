import { createFileRoute } from '@tanstack/react-router';

import { CAPABILITIES } from '@/auth/capabilities';
import { requireCapability } from '@/auth/guards';
import { AdminHealthPage } from '@/features/admin/AdminHealthPage';

export const Route = createFileRoute('/_admin/admin/health')({
  beforeLoad: async ({ context, location }) =>
    requireCapability(context.auth, { href: location.href }, CAPABILITIES.workflowManage),
  component: AdminHealthRoute,
});

function AdminHealthRoute() {
  return <AdminHealthPage />;
}
