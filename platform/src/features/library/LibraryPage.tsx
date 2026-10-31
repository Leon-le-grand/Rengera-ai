import { Link } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { fetchLawList } from '@/api/laws';
import { queryKeys } from '@/api/query-keys';
import type { FriendlyError } from '@/api/errors';
import { describeApiError } from '@/api/errors';
import type { LawListResponse, LawSummary } from '@/api/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import {
  LawStatusBadge,
  ReviewStatusBadge,
} from '@/components/ui/StatusBadges';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDate, pluralize } from '@/lib/format';

export interface LibrarySearch {
  q?: string;
  category?: string;
  page?: number;
}

interface LibraryPageProps {
  search: LibrarySearch;
  onSearchChange: (next: LibrarySearch) => void;
}

const PAGE_SIZE = 10;

function LawResultCard({ law }: { law: LawSummary }) {
  const { language } = useLanguage();
  const publication = formatDate(law.publication_date, language);
  const effective = formatDate(law.effective_date, language);

  return (
    <article className="surface p-5 transition-colors hover:border-[var(--app-border-strong)]">
      <div className="flex flex-wrap items-center gap-2">
        <LawStatusBadge status={law.status} />
        <ReviewStatusBadge status={law.review_status} />
        {law.category ? <span className="chip">{law.category}</span> : null}
        {law.type !== 'unknown' ? (
          <span className="chip capitalize">{law.type}</span>
        ) : null}
      </div>

      <h2 className="mt-3 text-lg font-bold leading-7 text-[var(--app-text)]">
        <Link
          to="/laws/$lawId"
          params={{ lawId: law.id }}
          className="underline-offset-4 hover:underline"
        >
          {law.title}
        </Link>
      </h2>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
        {law.reference_number ? (
          <span>Reference: {law.reference_number}</span>
        ) : null}
        {publication ? <span>Published: {publication}</span> : null}
        {effective ? <span>Effective: {effective}</span> : null}
        {law.article_count !== null ? (
          <span>
            {law.article_count}{' '}
            {pluralize(law.article_count, 'article', 'articles')} returned
          </span>
        ) : null}
      </div>

      {law.summary ? (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--app-text-2)]">
          {law.summary}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[var(--app-faint)]">
          No summary metadata was returned for this law.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          to="/laws/$lawId"
          params={{ lawId: law.id }}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--app-accent)]"
        >
          <BookOpen size={15} aria-hidden="true" />
          Read the law
        </Link>
        {law.updated_at ? (
          <span className="text-[10px] text-[var(--app-faint)]">
            API record updated {formatDate(law.updated_at, language) ?? law.updated_at}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function LibraryResults({
  data,
  error,
  isLoading,
  isFetching,
  hasFilters,
  onRetry,
  onClear,
}: {
  data: LawListResponse | undefined;
  error: FriendlyError | null;
  isLoading: boolean;
  isFetching: boolean;
  hasFilters: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  if (isLoading) {
    return (
      <LoadingBlock
        title="Loading available laws…"
        message="The library shows only records returned by the configured API."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title={error.title}
        message={error.message}
        requestId={error.requestId}
        onRetry={error.canRetry ? onRetry : undefined}
      />
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title={hasFilters ? 'No laws matched those filters' : 'No laws are available yet'}
        message={
          hasFilters
            ? 'Try a broader search or clear the category filter. This does not mean the law does not exist; it means the API returned no matching record.'
            : 'The API returned an empty law list. The V2 preview does not fill the gap with sample or invented laws.'
        }
        action={
          hasFilters ? (
            <button type="button" onClick={onClear} className="btn btn-secondary">
              <X size={15} aria-hidden="true" />
              Clear filters
            </button>
          ) : (
            <Link to="/chat" className="btn btn-secondary">
              Ask a question instead
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="relative">
      {isFetching ? (
        <p
          role="status"
          className="absolute -top-7 right-0 flex items-center gap-1.5 text-xs text-[var(--app-muted)]"
        >
          <RotateCw size={12} aria-hidden="true" className="animate-spin" />
          Updating results…
        </p>
      ) : null}

      <p className="mb-3 text-xs text-[var(--app-muted)]">
        {data.total !== null
          ? `${data.total} ${pluralize(data.total, 'law', 'laws')} returned`
          : `${data.items.length} ${pluralize(data.items.length, 'law', 'laws')} on this page`}
        <span className="text-[var(--app-faint)]">
          {' '}
          · Coverage is limited to available source records.
        </span>
      </p>

      <div className="space-y-3">
        {data.items.map((law) => (
          <LawResultCard key={law.id} law={law} />
        ))}
      </div>
    </div>
  );
}

interface LibrarySearchFormProps {
  initialQuery: string;
  category: string;
  categories: LawListResponse['categories'];
  hasFilters: boolean;
  onSearch: (next: LibrarySearch) => void;
  onClear: () => void;
  onCategoryChange: (category: string) => void;
}

function LibrarySearchForm({
  initialQuery,
  category,
  categories,
  hasFilters,
  onSearch,
  onClear,
  onCategoryChange,
}: LibrarySearchFormProps) {
  const [queryDraft, setQueryDraft] = useState(initialQuery);

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({
      q: queryDraft.trim() || undefined,
      category: category || undefined,
      page: 1,
    });
  };

  const clear = () => {
    setQueryDraft('');
    onClear();
  };

  return (
    <form onSubmit={applySearch} className="surface mt-6 p-4" role="search">
      <label
        htmlFor="library-query"
        className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]"
      >
        Search available laws
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-faint)]"
          />
          <input
            id="library-query"
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            className="field pl-9"
            placeholder="Law title, reference, category or keyword…"
          />
        </div>
        <button type="submit" className="btn btn-primary shrink-0">
          <Search size={15} aria-hidden="true" />
          Search
        </button>
        {hasFilters ? (
          <button type="button" onClick={clear} className="btn btn-ghost shrink-0">
            <X size={15} aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
            <Filter size={12} aria-hidden="true" />
            Category
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onCategoryChange('')}
              aria-pressed={!category}
              className={
                !category
                  ? 'chip border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                  : 'chip hover:border-[var(--app-border-strong)]'
              }
            >
              All categories
            </button>
            {categories.map((entry) => {
              const active = category === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onCategoryChange(active ? '' : entry.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? 'chip border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                      : 'chip hover:border-[var(--app-border-strong)]'
                  }
                >
                  {entry.label}
                  {entry.count !== null ? (
                    <span className="text-[var(--app-faint)]">{entry.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function LibraryPage({ search, onSearchChange }: LibraryPageProps) {
  const page = Math.max(1, search.page ?? 1);
  const category = search.category ?? '';
  const [formRevision, setFormRevision] = useState(0);

  const filters = {
    query: search.q ?? '',
    category,
    page,
    pageSize: PAGE_SIZE,
  };

  const listQuery = useQuery({
    queryKey: queryKeys.laws.list(filters),
    queryFn: ({ signal }) => fetchLawList(filters, signal),
    placeholderData: keepPreviousData,
  });

  const error = listQuery.error
    ? describeApiError(listQuery.error, 'law')
    : null;
  const data = listQuery.data;
  const hasFilters = Boolean(search.q || category);
  const hasPrevious = page > 1;
  const hasNext = data?.has_more ?? false;

  const setCategory = (next: string) => {
    onSearchChange({
      q: search.q || undefined,
      category: next || undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    // Remount the form when there is no `q` key change to reseed its input.
    if (!search.q) setFormRevision((revision) => revision + 1);
    onSearchChange({});
  };

  const goToPage = (nextPage: number) => {
    onSearchChange({
      q: search.q || undefined,
      category: category || undefined,
      page: nextPage > 1 ? nextPage : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Sources"
        title="Law library"
        description="Search the available source laws, read an article and check its recorded status. The library never claims to be a complete collection."
      />

      <LibrarySearchForm
        key={`${search.q ?? ''}:${formRevision}`}
        initialQuery={search.q ?? ''}
        category={category}
        categories={data?.categories ?? []}
        hasFilters={hasFilters}
        onSearch={onSearchChange}
        onClear={clearFilters}
        onCategoryChange={setCategory}
      />

      <div className="mt-6">
        <LibraryResults
          data={data}
          error={error}
          isLoading={listQuery.isPending}
          isFetching={listQuery.isFetching && !listQuery.isPending}
          hasFilters={hasFilters}
          onRetry={() => void listQuery.refetch()}
          onClear={clearFilters}
        />
      </div>

      {data && (hasPrevious || hasNext) ? (
        <nav
          aria-label="Law library pages"
          className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-4"
        >
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={!hasPrevious}
            className="btn btn-secondary"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            Previous
          </button>
          <p className="text-xs text-[var(--app-muted)]">
            Page {data.page}
          </p>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={!hasNext}
            className="btn btn-secondary"
          >
            Next
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      <p className="mt-6 text-xs leading-5 text-[var(--app-faint)]">
        Records are shown as returned by the API. Status and review labels describe
        stored metadata, not a guarantee that a law is current or that a human
        reviewed every classification.
      </p>
    </div>
  );
}
