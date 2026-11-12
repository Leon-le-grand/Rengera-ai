import { createFileRoute, Outlet } from '@tanstack/react-router';

import { requireAuthenticated } from '@/auth/guards';
import { AppLayout } from '@/components/layout/AppLayout';

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (
      location.pathname === '/emergency' ||
      location.pathname.startsWith('/emergency/')
    ) {
      return;
    }
    return requireAuthenticated(context.auth, location);
  },
  component: AppRouteLayout,
});

function AppRouteLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
