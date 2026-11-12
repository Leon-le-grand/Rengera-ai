import { createFileRoute } from '@tanstack/react-router';

import { LawReaderPage } from '@/features/shards/LawReaderPage';

export const Route = createFileRoute('/_app/shards/$lawId/')({
  component: LawDetailRoute,
});

function LawDetailRoute() {
  const { lawId } = Route.useParams();
  return <LawReaderPage lawId={lawId} />;
}
