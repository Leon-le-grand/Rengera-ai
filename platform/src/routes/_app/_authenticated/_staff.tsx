import { createFileRoute, Outlet } from '@tanstack/react-router';

import { STAFF_WORKSPACE_PERMISSIONS } from '@/auth/capabilities';
import { requireAnyCapability } from '@/auth/guards';

export const Route = createFileRoute('/_app/_authenticated/_staff')({
  beforeLoad: async ({ context, location }) =>
    requireAnyCapability(
      context.auth,
      { href: location.href },
      STAFF_WORKSPACE_PERMISSIONS,
    ),
  component: Outlet,
});
