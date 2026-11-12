import { createFileRoute } from '@tanstack/react-router';

import { LawReaderPage } from '@/features/shards/LawReaderPage';

export const Route = createFileRoute(
  '/_app/shards/$lawId/ast_nodes/$articleNumber',
)({
  component: LawArticleRoute,
});

function LawArticleRoute() {
  const { lawId, articleNumber } = Route.useParams();
  return <LawReaderPage lawId={lawId} articleNumber={articleNumber} />;
}
