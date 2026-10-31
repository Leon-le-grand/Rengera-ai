import { createFileRoute, Outlet } from '@tanstack/react-router';

import { CAPABILITIES } from '@/auth/capabilities';
import { requireCapability } from '@/auth/guards';

export const Route = createFileRoute('/_app/_authenticated/_admin')({
  beforeLoad: async ({ context, location }) =>
    requireCapability(context.auth, {
      href: location.href,
    }, CAPABILITIES.lawPublish),
  component: Outlet,
});
