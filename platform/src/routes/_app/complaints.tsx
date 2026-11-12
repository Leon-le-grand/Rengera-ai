import { createFileRoute } from '@tanstack/react-router';

import { ComplaintsPage } from '@/features/complaints/ComplaintsPage';

export const Route = createFileRoute('/_app/complaints')({
  component: ComplaintsRoute,
});

function ComplaintsRoute() {
  return <ComplaintsPage />;
}
