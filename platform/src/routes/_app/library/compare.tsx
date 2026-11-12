import { createFileRoute } from '@tanstack/react-router';

import { LawComparisonPage } from '@/features/shards/LawComparisonPage';

export const Route = createFileRoute('/_app/library/compare')({
  component: LawComparisonRoute,
});

function LawComparisonRoute() {
  return <LawComparisonPage />;
}
