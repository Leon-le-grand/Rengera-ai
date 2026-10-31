import { createFileRoute } from '@tanstack/react-router';

import { WorkspacePage } from '@/features/workspace/WorkspacePage';

export const Route = createFileRoute('/_app/_authenticated/_staff/staff')({
  component: StaffRoute,
});

function StaffRoute() {
  return <WorkspacePage kind="staff" />;
}
