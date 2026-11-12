import { createFileRoute } from '@tanstack/react-router';

import { BookmarksPage } from '@/features/bookmarks/BookmarksPage';

export const Route = createFileRoute('/_app/bookmarks')({
  component: BookmarksRoute,
});

function BookmarksRoute() {
  return <BookmarksPage />;
}
