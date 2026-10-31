import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/laws/$lawId')({
  component: LawRouteLayout,
});

function LawRouteLayout() {
  return <Outlet />;
}
