import { createFileRoute } from '@tanstack/react-router';

import { AdminIngestPage } from '@/features/admin/AdminIngestPage';

export const Route = createFileRoute('/_admin/admin/ingest')({
  component: AdminIngestRoute,
});

function AdminIngestRoute() {
  return <AdminIngestPage />;
}
