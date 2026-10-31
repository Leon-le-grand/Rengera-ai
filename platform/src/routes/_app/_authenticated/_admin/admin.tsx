import { createFileRoute } from '@tanstack/react-router';

import { WorkspacePage } from '@/features/workspace/WorkspacePage';

export const Route = createFileRoute('/_app/_authenticated/_admin/admin')({
  component: AdminRoute,
});

function AdminRoute() {
  return <WorkspacePage kind="admin" />;
}
