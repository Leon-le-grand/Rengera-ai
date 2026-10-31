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

import { useLawDetail } from './use-law-detail';

function sortedArticles(law: LawDetail): LawArticle[] {
  return [...law.articles].sort((a, b) => a.sort_order - b.sort_order);
}

function LawMeta({ law }: { law: LawDetail }) {
  const { language } = useLanguage();
  const entries = [
    { label: 'Reference', value: law.reference_number },
    { label: 'Gazette', value: law.gazette_reference },
    { label: 'Published', value: formatDate(law.publication_date, language) },
    { label: 'Effective', value: formatDate(law.effective_date, language) },
    { label: 'Category', value: law.category },
    { label: 'Language', value: law.language },
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

function LawSummaryHeader({ law }: { law: LawDetail }) {
  const articles = sortedArticles(law);

  return (
    <>
      <PageHeader
        eyebrow="Law reader"
        title={law.title}
        description={
          <span className="block space-y-3">
            <span className="flex flex-wrap items-center gap-2">
              <LawStatusBadge status={law.status} />
              <ReviewStatusBadge status={law.review_status} />
              {law.type !== 'unknown' ? (
                <span className="chip capitalize">{law.type}</span>
              ) : null}
              <span className="chip">
                {articles.length}{' '}
                {articles.length === 1 ? 'article returned' : 'articles returned'}
              </span>
            </span>
            <span className="block">
              Original source text is shown as returned by the API. This page does
              not paraphrase or repair the law.
            </span>
          </span>
        }
        actions={
          <Link to="/library" className="btn btn-secondary">
            <ArrowLeft size={15} aria-hidden="true" />
            Law library
          </Link>
        }
      />

      <LawMeta law={law} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ExternalSourceLink href={law.source_url}>Official source</ExternalSourceLink>
        {law.reviewed_at ? (
          <span className="text-xs text-[var(--app-faint)]">
            Classification reviewed {formatDate(law.reviewed_at) ?? law.reviewed_at}
          </span>
        ) : null}
      </div>

      {law.summary ? (
        <section className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
          <p className="eyebrow">Summary metadata</p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {law.summary}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-[var(--app-faint)]">
            This summary is derived metadata returned by the API. It is not the
            source text and may not reflect the whole law.
          </p>
        </section>
      ) : null}
    </>
  );
}

function ArticleBody({ article }: { article: LawArticle }) {
  return (
    <>
      {article.needs_ocr ? (
        <InlineNotice tone="warning" className="mb-4" title="OCR warning">
          This extracted text is marked as needing OCR review. Characters or
          wording may be wrong. Check the official source before relying on it.
        </InlineNotice>
      ) : null}
      <div className="law-text">{article.content}</div>
      {article.citation ? (
        <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs leading-5 text-[var(--app-muted)]">
          Citation: {article.citation}
        </p>
      ) : null}
      <ExternalSourceLink href={article.source_url} className="mt-1">
        Source for this article
      </ExternalSourceLink>
    </>
  );
}

function LawContent({ law }: { law: LawDetail }) {
  const articles = sortedArticles(law);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 space-y-8">
        {law.preamble ? (
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
            <div className="law-text mt-4">{law.preamble}</div>
          </section>
        ) : null}

        {articles.length === 0 ? (
          <EmptyState
            title="No articles were returned for this law"
            message="The law record exists, but the API did not return readable article text. Nothing has been invented to fill the gap."
            action={
              <Link to="/library" className="btn btn-secondary">
                Back to the library
              </Link>
            }
          />
        ) : (
          <section aria-labelledby="articles-heading">
            <div className="flex items-end justify-between gap-3 border-b border-[var(--app-border)] pb-3">
              <h2
                id="articles-heading"
                className="text-lg font-bold text-[var(--app-text)]"
              >
                Articles
              </h2>
              <span className="text-xs text-[var(--app-faint)]">
                {articles.length} returned
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {articles.map((article) => (
                <article
                  key={article.id}
                  id={articleAnchorId(article.article_number)}
                  className="surface scroll-mt-24 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--app-accent)]">
                        {article.article_number
                          ? `Article ${article.article_number}`
                          : 'Unnumbered provision'}
                      </p>
                      {article.article_title ? (
                        <h3 className="mt-1 text-base font-bold text-[var(--app-text)]">
                          {article.article_title}
                        </h3>
                      ) : null}
                    </div>
                    {article.article_number ? (
                      <Link
                        to="/laws/$lawId/articles/$articleNumber"
                        params={{
                          lawId: law.id,
                          articleNumber: article.article_number,
                        }}
                        className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[var(--app-accent)]"
                      >
                        Open article
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <ArticleBody article={article} />
                  </div>
                </article>
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
          <nav aria-label="Article contents" className="mt-3 space-y-1.5">
            {law.preamble ? (
              <a
                href="#preamble-heading"
                className="block py-1 text-xs leading-5 text-[var(--app-muted)] hover:text-[var(--app-accent)]"
              >
                Preamble
              </a>
            ) : null}
            {articles.map((article) => (
              <a
                key={article.id}
                href={`#${articleAnchorId(article.article_number)}`}
                className="block py-1 text-xs leading-5 text-[var(--app-muted)] hover:text-[var(--app-accent)]"
              >
                {article.article_number
                  ? `Article ${article.article_number}`
                  : 'Unnumbered provision'}
                {article.article_title ? ` — ${article.article_title}` : ''}
              </a>
            ))}
          </nav>
          <div className="mt-4 border-t border-[var(--app-border)] pt-3">
            <p className="text-[10px] leading-4 text-[var(--app-faint)]">
              Status and review labels describe stored metadata. They do not
              guarantee that a law is current.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ArticleReader({
  law,
  articleNumber,
}: {
  law: LawDetail;
  articleNumber: string;
}) {
  const articles = sortedArticles(law);
  const index = articles.findIndex(
    (article) =>
      article.article_number.toLowerCase() === articleNumber.toLowerCase(),
  );

  if (index === -1) {
    return (
      <EmptyState
        title="That article is not available in this record"
        message={`The API returned this law without an article matching "${articleNumber}". No substitute text was invented.`}
        action={
          <Link
            to="/laws/$lawId"
            params={{ lawId: law.id }}
            className="btn btn-secondary"
          >
            Read the available articles
          </Link>
        }
      />
    );
  }

  const article = articles[index];
  const previous = index > 0 ? articles[index - 1] : null;
  const next = index < articles.length - 1 ? articles[index + 1] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0">
        <article className="surface p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <LawStatusBadge status={law.status} />
            <ReviewStatusBadge status={law.review_status} />
            <span className="chip">
              {article.article_number
                ? `Article ${article.article_number}`
                : 'Unnumbered provision'}
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[var(--app-text)] sm:text-3xl">
            {article.article_title ?? law.title}
          </h1>
          {article.article_title ? (
            <p className="mt-1 text-sm text-[var(--app-muted)]">{law.title}</p>
          ) : null}
          {law.reference_number ? (
            <p className="mt-1 text-xs text-[var(--app-faint)]">
              {law.reference_number}
            </p>
          ) : null}

          <div className="mt-6">
            <ArticleBody article={article} />
          </div>

          <p className="mt-6 border-t border-[var(--app-border)] pt-4 text-xs leading-5 text-[var(--app-faint)]">
            This is the source text returned by the API, not a summary. Status and
            review labels do not guarantee currency.
          </p>
        </article>

        <nav
          aria-label="Article navigation"
          className="mt-5 flex flex-col justify-between gap-3 sm:flex-row"
        >
          {previous ? (
            <Link
              to="/laws/$lawId/articles/$articleNumber"
              params={{
                lawId: law.id,
                articleNumber: previous.article_number,
              }}
              className="btn btn-secondary max-w-full justify-start text-left"
            >
              <ArrowLeft size={15} aria-hidden="true" className="shrink-0" />
              <span className="truncate">
                {previous.article_number
                  ? `Article ${previous.article_number}`
                  : 'Previous provision'}
              </span>
            </Link>
          ) : (
            <span />
          )}
          <Link
            to="/laws/$lawId"
            params={{ lawId: law.id }}
            className="btn btn-ghost"
          >
            <BookOpen size={15} aria-hidden="true" />
            Full law
          </Link>
          {next ? (
            <Link
              to="/laws/$lawId/articles/$articleNumber"
              params={{ lawId: law.id, articleNumber: next.article_number }}
              className="btn btn-secondary max-w-full justify-end text-right"
            >
              <span className="truncate">
                {next.article_number
                  ? `Article ${next.article_number}`
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
          <p className="eyebrow">Law</p>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--app-text)]">
            {law.title}
          </p>
          <div className="mt-3 space-y-2 text-xs text-[var(--app-muted)]">
            {law.reference_number ? (
              <p className="flex items-start gap-1.5">
                <Hash size={12} aria-hidden="true" className="mt-1 shrink-0" />
                {law.reference_number}
              </p>
            ) : null}
            {formatDate(law.publication_date) ? (
              <p className="flex items-start gap-1.5">
                <CalendarDays size={12} aria-hidden="true" className="mt-1 shrink-0" />
                Published {formatDate(law.publication_date)}
              </p>
            ) : null}
          </div>
          <Link
            to="/laws/$lawId"
            params={{ lawId: law.id }}
            className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[var(--app-accent)]"
          >
            <BookOpen size={13} aria-hidden="true" />
            Read the full law
          </Link>
          <ExternalSourceLink href={law.source_url} className="mt-1 text-xs">
            Official source
          </ExternalSourceLink>
          <div className="mt-4 border-t border-[var(--app-border)] pt-3">
            <p className="text-[10px] leading-4 text-[var(--app-faint)]">
              Article {index + 1} of {articles.length} returned. This is not a
              statement that no other articles exist in the official law.
            </p>
          </div>
        </div>
      </aside>
    </div>
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
  const error = query.error ? describeApiError(query.error, 'law') : null;

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <LoadingBlock
          title="Loading the law…"
          message="Source text and article records come from the configured API."
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
            Back to the law library
          </Link>
        </ErrorState>
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState
          title="No law record was returned"
          message="The API did not return a law for this address. Nothing was invented."
          action={
            <Link to="/library" className="btn btn-secondary">
              Search the library
            </Link>
          }
        />
      </div>
    );
  }

  const law = query.data;

  if (articleNumber) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[var(--app-muted)]">
          <Link to="/library" className="inline-flex items-center gap-1 font-semibold hover:text-[var(--app-text)]">
            <ArrowLeft size={13} aria-hidden="true" />
            Law library
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to="/laws/$lawId"
            params={{ lawId: law.id }}
            className="max-w-[20rem] truncate font-semibold hover:text-[var(--app-text)]"
          >
            {law.title}
          </Link>
        </div>
        <ArticleReader law={law} articleNumber={articleNumber} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <LawSummaryHeader law={law} />
      <LawContent law={law} />
    </div>
  );
}
