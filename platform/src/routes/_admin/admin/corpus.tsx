import { createFileRoute } from '@tanstack/react-router';

import { AdminCorpusPage } from '@/features/admin/AdminCorpusPage';

export const Route = createFileRoute('/_admin/admin/corpus')({
  component: AdminCorpusRoute,
});

function AdminCorpusRoute() {
  return <AdminCorpusPage />;
}
