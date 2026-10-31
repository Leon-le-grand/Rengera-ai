import { createFileRoute } from '@tanstack/react-router';

import { LawReaderPage } from '@/features/laws/LawReaderPage';

export const Route = createFileRoute('/_app/laws/$lawId/')({
  component: LawDetailRoute,
});

function LawDetailRoute() {
  const { lawId } = Route.useParams();
  return <LawReaderPage lawId={lawId} />;
}
