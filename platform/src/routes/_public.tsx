import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';

import { PublicLayout } from '@/components/layout/PublicLayout';

export const Route = createFileRoute('/_public')({
  component: PublicRouteLayout,
});

function PublicRouteLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  if (pathname === '/' || pathname === '/login') return <Outlet />;

  return (
    <PublicLayout accessDenied={pathname === '/386'}>
      <Outlet />
    </PublicLayout>
  );
}
