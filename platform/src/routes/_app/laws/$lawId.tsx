import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/shards/$lawId')({
  component: LawRouteLayout,
});

function LawRouteLayout() {
  return <Outlet />;
}
