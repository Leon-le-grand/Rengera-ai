import { createFileRoute, Outlet } from '@tanstack/react-router';

import { PublicLayout } from '@/components/layout/PublicLayout';

export const Route = createFileRoute('/_public')({
  component: PublicRouteLayout,
});

function PublicRouteLayout() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}
