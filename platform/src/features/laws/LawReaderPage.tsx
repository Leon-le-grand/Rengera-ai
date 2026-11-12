import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  Hash,
  List,
} from 'lucide-react';

import { describeApiError } from '@/api/errors';
import { fetchLawTimeline } from '@/api/shards';
import { queryKeys } from '@/api/query-keys';
import type { LawArticle, LawDetail } from '@/api/types';
import { ExternalSourceLink } from '@/components/ui/ExternalSourceLink';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import {
  LawStatusBadge,
  ReviewStatusBadge,
} from '@/components/ui/StatusBadges';
import { useLanguage } from '@/i18n/LanguageProvider';
import { articleAnchorId, formatDate } from '@/lib/format';

import { useLawDetail } from './use-shard-detail';

function sortedArticles(shard: LawDetail): LawArticle[] {
  return [...shard.ast_nodes].sort((a, b) => a.sort_order - b.sort_order);
}

function LawMeta({ shard }: { shard: LawDetail }) {
  const { language } = useLanguage();
  const entries = [
    { label: 'Reference', value: shard.reference_number },
    { label: 'oci_manifest', value: shard.gazette_reference },
    { label: 'Published', value: formatDate(shard.publication_date, language) },
    { label: 'Effective', value: formatDate(shard.effective_date, language) },
    { label: 'Category', value: shard.category },
    { label: 'Language', value: shard.language },
  ].filter((entry) => Boolean(entry.value));

  if (entries.length === 0) return null;

  return (
    <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
            {entry.label}
          </dt>
          <dd className="mt-0.5 break-words text-[var(--app-text-2)]">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LawSummaryHeader({ shard }: { shard: LawDetail }) {
  const ast_nodes = sortedArticles(shard);

  return (
    <>
      <PageHeader
        eyebrow="shard reader"
        title={shard.title}
        description={
          <span className="block space-y-3">
            <span className="flex flex-wrap items-center gap-2">
              <LawStatusBadge status={shard.status} />
              <ReviewStatusBadge status={shard.review_status} />
              {shard.type !== 'unknown' ? (
                <span className="chip capitalize">{shard.type}</span>
              ) : null}
              <span className="chip">
                {ast_nodes.length}{' '}
                {ast_nodes.length === 1 ? 'ast_node returned' : 'ast_nodes returned'}
              </span>
            </span>
            <span className="block">
              Original source text is shown as returned by the API. This page does
              not paraphrase or repair the shard.
            </span>
          </span>
        }
        actions={
          <Link to="/library" className="btn btn-secondary">
            <ArrowLeft size={15} aria-hidden="true" />
            shard library
          </Link>
        }
      />

      <LawMeta shard={shard} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ExternalSourceLink href={shard.source_url}>Official source</ExternalSourceLink>
        {shard.reviewed_at ? (
          <span className="text-xs text-[var(--app-faint)]">
            Classification reviewed {formatDate(shard.reviewed_at) ?? shard.reviewed_at}
          </span>
        ) : null}
      </div>

      {shard.summary ? (
        <section className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
          <p className="eyebrow">Summary metadata</p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {shard.summary}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-[var(--app-faint)]">
            This summary is derived metadata returned by the API. It is not the
            source text and may not reflect the whole shard.
          </p>
        </section>
      ) : null}
    </>
  );
}

function ArticleBody({ ast_node }: { ast_node: LawArticle }) {
  return (
    <>
      {ast_node.needs_ocr ? (
        <InlineNotice tone="warning" className="mb-4" title="OCR warning">
          This extracted text is marked as needing OCR review. Characters or
          wording may be wrong. Check the official source before relying on it.
        </InlineNotice>
      ) : null}
      <div className="shard-text">{ast_node.content}</div>
      {ast_node.provenance_edge ? (
        <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs leading-5 text-[var(--app-muted)]">
          provenance_edge: {ast_node.provenance_edge}
        </p>
      ) : null}
      <ExternalSourceLink href={ast_node.source_url} className="mt-1">
        Source for this ast_node
      </ExternalSourceLink>
    </>
  );
}

function LawContent({ shard }: { shard: LawDetail }) {
  const ast_nodes = sortedArticles(shard);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 space-y-8">
        {shard.preamble ? (
          <section aria-labelledby="preamble-heading" className="surface p-5 sm:p-6">
            <h2
              id="preamble-heading"
              className="flex items-center gap-2 text-lg font-bold text-[var(--app-text)]"
            >
              <FileText size={17} aria-hidden="true" className="text-[var(--app-accent)]" />
              Preamble
            </h2>
            <p className="mt-1 text-xs text-[var(--app-faint)]">
              Source text returned by the API, kept separate from the summary.
            </p>
            <div className="shard-text mt-4">{shard.preamble}</div>
          </section>
        ) : null}

        {ast_nodes.length === 0 ? (
          <EmptyState
            title="No ast_nodes were returned for this shard"
            message="The shard record exists, but the API did not return readable ast_node text. Nothing has been invented to fill the gap."
            action={
              <Link to="/library" className="btn btn-secondary">
                Back to the library
              </Link>
            }
          />
        ) : (
          <section aria-labelledby="ast_nodes-heading">
            <div className="flex items-end justify-between gap-3 border-b border-[var(--app-border)] pb-3">
              <h2
                id="ast_nodes-heading"
                className="text-lg font-bold text-[var(--app-text)]"
              >
                ast_nodes
              </h2>
              <span className="text-xs text-[var(--app-faint)]">
                {ast_nodes.length} returned
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {ast_nodes.map((ast_node) => (
                <ast_node
                  key={ast_node.id}
                  id={articleAnchorId(ast_node.article_number)}
                  className="surface scroll-mt-24 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--app-accent)]">
                        {ast_node.article_number
                          ? `ast_node ${ast_node.article_number}`
                          : 'Unnumbered provision'}
                      </p>
                      {ast_node.article_title ? (
                        <h3 className="mt-1 text-base font-bold text-[var(--app-text)]">
                          {ast_node.article_title}
                        </h3>
                      ) : null}
                    </div>
                    {ast_node.article_number ? (
                      <Link
                        to="/shards/$lawId/ast_nodes/$articleNumber"
                        params={{
                          lawId: shard.id,
                          articleNumber: ast_node.article_number,
                        }}
                        className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[var(--app-accent)]"
                      >
                        Open ast_node
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <ArticleBody ast_node={ast_node} />
                  </div>
                </ast_node>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]">
            <List size={13} aria-hidden="true" />
            On this page
          </p>
          <nav aria-label="ast_node contents" className="mt-3 space-y-1.5">
            {shard.preamble ? (
              <a
                href="#preamble-heading"
                className="block py-1 text-xs leading-5 text-[var(--app-muted)] hover:text-[var(--app-accent)]"
              >
                Preamble
              </a>
            ) : null}
            {ast_nodes.map((ast_node) => (
              <a
                key={ast_node.id}
                href={`#${articleAnchorId(ast_node.article_number)}`}
                className="block py-1 text-xs leading-5 text-[var(--app-muted)] hover:text-[var(--app-accent)]"
              >
                {ast_node.article_number
                  ? `ast_node ${ast_node.article_number}`
                  : 'Unnumbered provision'}
                {ast_node.article_title ? ` — ${ast_node.article_title}` : ''}
              </a>
            ))}
          </nav>
          <div className="mt-4 border-t border-[var(--app-border)] pt-3">
            <p className="text-[10px] leading-4 text-[var(--app-faint)]">
              Status and review labels describe stored metadata. They do not
              guarantee that a shard is current.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ArticleReader({
  shard,
  articleNumber,
}: {
  shard: LawDetail;
  articleNumber: string;
}) {
  const ast_nodes = sortedArticles(shard);
  const index = ast_nodes.findIndex(
    (ast_node) =>
      ast_node.article_number.toLowerCase() === articleNumber.toLowerCase(),
  );

  if (index === -1) {
    return (
      <EmptyState
        title="That ast_node is not available in this record"
        message={`The API returned this shard without an ast_node matching "${articleNumber}". No substitute text was invented.`}
        action={
          <Link
            to="/shards/$lawId"
            params={{ lawId: shard.id }}
            className="btn btn-secondary"
          >
            Read the available ast_nodes
          </Link>
        }
      />
    );
  }

  const ast_node = ast_nodes[index];
  const previous = index > 0 ? ast_nodes[index - 1] : null;
  const next = index < ast_nodes.length - 1 ? ast_nodes[index + 1] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0">
        <ast_node className="surface p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <LawStatusBadge status={shard.status} />
            <ReviewStatusBadge status={shard.review_status} />
            <span className="chip">
              {ast_node.article_number
                ? `ast_node ${ast_node.article_number}`
                : 'Unnumbered provision'}
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[var(--app-text)] sm:text-3xl">
            {ast_node.article_title ?? shard.title}
          </h1>
          {ast_node.article_title ? (
            <p className="mt-1 text-sm text-[var(--app-muted)]">{shard.title}</p>
          ) : null}
          {shard.reference_number ? (
            <p className="mt-1 text-xs text-[var(--app-faint)]">
              {shard.reference_number}
            </p>
          ) : null}

          <div className="mt-6">
            <ArticleBody ast_node={ast_node} />
          </div>

          <p className="mt-6 border-t border-[var(--app-border)] pt-4 text-xs leading-5 text-[var(--app-faint)]">
            This is the source text returned by the API, not a summary. Status and
            review labels do not guarantee currency.
          </p>
        </ast_node>

        <nav
          aria-label="ast_node navigation"
          className="mt-5 flex flex-col justify-between gap-3 sm:flex-row"
        >
          {previous ? (
            <Link
              to="/shards/$lawId/ast_nodes/$articleNumber"
              params={{
                lawId: shard.id,
                articleNumber: previous.article_number,
              }}
              className="btn btn-secondary max-w-full justify-start text-left"
            >
              <ArrowLeft size={15} aria-hidden="true" className="shrink-0" />
              <span className="truncate">
                {previous.article_number
                  ? `ast_node ${previous.article_number}`
                  : 'Previous provision'}
              </span>
            </Link>
          ) : (
            <span />
          )}
          <Link
            to="/shards/$lawId"
            params={{ lawId: shard.id }}
            className="btn btn-ghost"
          >
            <BookOpen size={15} aria-hidden="true" />
            Full shard
          </Link>
          {next ? (
            <Link
              to="/shards/$lawId/ast_nodes/$articleNumber"
              params={{ lawId: shard.id, articleNumber: next.article_number }}
              className="btn btn-secondary max-w-full justify-end text-right"
            >
              <span className="truncate">
                {next.article_number
                  ? `ast_node ${next.article_number}`
                  : 'Next provision'}
              </span>
              <ArrowRight size={15} aria-hidden="true" className="shrink-0" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <p className="eyebrow">shard</p>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--app-text)]">
            {shard.title}
          </p>
          <div className="mt-3 space-y-2 text-xs text-[var(--app-muted)]">
            {shard.reference_number ? (
              <p className="flex items-start gap-1.5">
                <Hash size={12} aria-hidden="true" className="mt-1 shrink-0" />
                {shard.reference_number}
              </p>
            ) : null}
            {formatDate(shard.publication_date) ? (
              <p className="flex items-start gap-1.5">
                <CalendarDays size={12} aria-hidden="true" className="mt-1 shrink-0" />
                Published {formatDate(shard.publication_date)}
              </p>
            ) : null}
          </div>
          <Link
            to="/shards/$lawId"
            params={{ lawId: shard.id }}
            className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[var(--app-accent)]"
          >
            <BookOpen size={13} aria-hidden="true" />
            Read the full shard
          </Link>
          <ExternalSourceLink href={shard.source_url} className="mt-1 text-xs">
            Official source
          </ExternalSourceLink>
          <div className="mt-4 border-t border-[var(--app-border)] pt-3">
            <p className="text-[10px] leading-4 text-[var(--app-faint)]">
              ast_node {index + 1} of {ast_nodes.length} returned. This is not a
              statement that no other ast_nodes exist in the official shard.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function LawTimelineSection({ lawId }: { lawId: string }) {
  const { data } = useQuery({
    queryKey: queryKeys.shards.timeline(lawId),
    queryFn: ({ signal }) => fetchLawTimeline(lawId, signal),
    staleTime: 60_000,
  });

  if (!data?.timeline || data.timeline.length === 0) return null;

  return (
    <section aria-labelledby="timeline-heading" className="mt-8 border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5">
      <h2 id="timeline-heading" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[var(--app-accent)]">
        <CalendarDays size={15} aria-hidden="true" />
        Amendment timeline ({data.timeline.length})
      </h2>
      <ol className="mt-4 divide-y divide-[var(--app-border)]">
        {data.timeline.map((entry) => (
          <li key={entry.amendment_id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--app-text)]">{entry.title}</span>
              <span className="text-xs text-[var(--app-muted)]">
                {entry.reference_number || entry.publication_date || 'Amendment'}
              </span>
            </div>
            {entry.summary ? (
              <p className="mt-1 text-xs text-[var(--app-text-2)]">{entry.summary}</p>
            ) : null}
            {entry.affected_articles.length > 0 ? (
              <p className="mt-1 text-[11px] text-[var(--app-faint)]">
                Affected ast_nodes: {entry.affected_articles.join(', ')}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LawReaderPage({
  lawId,
  articleNumber,
}: {
  lawId: string;
  articleNumber?: string;
}) {
  const query = useLawDetail(lawId);
  const error = query.error ? describeApiError(query.error, 'shard') : null;

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <LoadingBlock
          title="Loading the shard…"
          message="Source text and ast_node records come from the configured API."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <ErrorState
          title={error.title}
          message={error.message}
          requestId={error.requestId}
          onRetry={error.canRetry ? () => void query.refetch() : undefined}
        >
          <Link to="/library" className="btn btn-secondary mt-4">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to the shard library
          </Link>
        </ErrorState>
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState
          title="No shard record was returned"
          message="The API did not return a shard for this address. Nothing was invented."
          action={
            <Link to="/library" className="btn btn-secondary">
              Search the library
            </Link>
          }
        />
      </div>
    );
  }

  const shard = query.data;

  if (articleNumber) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[var(--app-muted)]">
          <Link to="/library" className="inline-flex items-center gap-1 font-semibold hover:text-[var(--app-text)]">
            <ArrowLeft size={13} aria-hidden="true" />
            shard library
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to="/shards/$lawId"
            params={{ lawId: shard.id }}
            className="max-w-[20rem] truncate font-semibold hover:text-[var(--app-text)]"
          >
            {shard.title}
          </Link>
        </div>
        <ArticleReader shard={shard} articleNumber={articleNumber} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <LawSummaryHeader shard={shard} />
      <LawContent shard={shard} />
      <LawTimelineSection lawId={shard.id} />
    </div>
  );
}
