import { createFileRoute } from '@tanstack/react-router';

import { LibraryPage } from '@/features/library/LibraryPage';
import type { LibrarySearch } from '@/features/library/LibraryPage';

export const Route = createFileRoute('/_app/library')({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const rawPage =
      typeof search.page === 'string' ? Number(search.page) : search.page;
    const page =
      typeof rawPage === 'number' && Number.isFinite(rawPage) && rawPage > 1
        ? Math.floor(rawPage)
        : undefined;

    return {
      q:
        typeof search.q === 'string' && search.q.trim()
          ? search.q.trim().slice(0, 200)
          : undefined,
      category:
        typeof search.category === 'string' && search.category.trim()
          ? search.category.trim().slice(0, 100)
          : undefined,
      page,
    };
  },
  component: LibraryRoute,
});

function LibraryRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <LibraryPage
      search={search}
      onSearchChange={(next) => {
        void navigate({ search: next });
      }}
    />
  );
}
