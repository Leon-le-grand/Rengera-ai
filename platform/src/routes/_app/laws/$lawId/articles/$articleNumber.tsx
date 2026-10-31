import { createFileRoute } from '@tanstack/react-router';

import { LawReaderPage } from '@/features/laws/LawReaderPage';

export const Route = createFileRoute(
  '/_app/laws/$lawId/articles/$articleNumber',
)({
  component: LawArticleRoute,
});

function LawArticleRoute() {
  const { lawId, articleNumber } = Route.useParams();
  return <LawReaderPage lawId={lawId} articleNumber={articleNumber} />;
}
