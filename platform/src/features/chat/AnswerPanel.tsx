import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileText,
  Phone,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';

import type { AnswerEvidence, AnswerResponse } from '@/api/types';
import { ExternalSourceLink } from '@/components/ui/ExternalSourceLink';
import {
  LawStatusBadge,
  ReviewStatusBadge,
} from '@/components/ui/StatusBadges';

function EvidenceCard({ evidence }: { evidence: AnswerEvidence }) {
  return (
    <article className="border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {evidence.status !== 'unknown' ? (
          <LawStatusBadge status={evidence.status} />
        ) : null}
        {evidence.review_status !== 'unknown' ? (
          <ReviewStatusBadge status={evidence.review_status} />
        ) : null}
        {evidence.article_number ? (
          <span className="chip">Article {evidence.article_number}</span>
        ) : null}
      </div>

      <h4 className="mt-3 text-sm font-bold leading-6 text-[var(--app-text)]">
        {evidence.law_title ?? 'Law title not supplied'}
      </h4>
      {evidence.reference_number ? (
        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
          {evidence.reference_number}
        </p>
      ) : null}
      {evidence.article_title ? (
        <p className="mt-1 text-xs font-semibold text-[var(--app-text-2)]">
          {evidence.article_title}
        </p>
      ) : null}

      {evidence.excerpt ? (
        <blockquote className="law-text mt-3 border-l-2 border-[var(--app-accent-border)] pl-3 text-sm">
          {evidence.excerpt}
        </blockquote>
      ) : null}

      {evidence.citation ? (
        <p className="mt-3 text-xs leading-5 text-[var(--app-faint)]">
          {evidence.citation}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {evidence.law_id ? (
          evidence.article_number ? (
            <Link
              to="/laws/$lawId/articles/$articleNumber"
              params={{
                lawId: evidence.law_id,
                articleNumber: evidence.article_number,
              }}
              className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[var(--app-accent)]"
            >
              <BookOpen size={14} aria-hidden="true" />
              Read in the law reader
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/laws/$lawId"
              params={{ lawId: evidence.law_id }}
              className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[var(--app-accent)]"
            >
              <BookOpen size={14} aria-hidden="true" />
              Open the law
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          )
        ) : null}
        <ExternalSourceLink href={evidence.source_url}>
          Official source
        </ExternalSourceLink>
      </div>
    </article>
  );
}

export function AnswerPanel({
  response,
  onRetry,
}: {
  response: AnswerResponse;
  onRetry?: () => void;
}) {
  const hasEvidence = response.evidence.length > 0;

  return (
    <section aria-label="Answer" className="space-y-4">
      {response.outcome === 'urgent' ? (
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-5">
          <p className="flex items-center gap-2 text-base font-bold text-[var(--app-danger-text)]">
            <ShieldAlert size={18} aria-hidden="true" />
            This may be an emergency.
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {response.answer ??
              'The question describes possible immediate danger. Do not wait for an online answer before contacting emergency services.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="tel:112" className="btn btn-danger">
              <Phone size={15} aria-hidden="true" />
              Call 112 now
            </a>
            <Link to="/emergency" className="btn btn-secondary">
              Emergency contacts
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--app-faint)]">
            This route is local. It does not wait for the assistant.
          </p>
        </div>
      ) : null}

      {response.outcome === 'greeting' || response.outcome === 'help' ? (
        <div className="surface p-5 sm:p-6">
          <p className="eyebrow">Assistant reply</p>
          <div className="law-text mt-3">{response.answer}</div>
          <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs leading-5 text-[var(--app-faint)]">
            This reply did not use a legal source. Ask a specific question about
            an available law to receive a sourced answer.
          </p>
        </div>
      ) : null}

      {response.outcome === 'answered' && response.answer ? (
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Sourced answer</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
              Not legal advice
            </p>
          </div>
          <div className="law-text mt-3 border-l-2 border-[var(--app-accent)] pl-4">
            {response.answer}
          </div>
          {response.notice ? (
            <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs leading-5 text-[var(--app-muted)]">
              {response.notice}
            </p>
          ) : null}
          <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs leading-5 text-[var(--app-faint)]">
            The explanation is generated. The cited source text remains
            authoritative; open the article to read it in full.
          </p>
        </div>
      ) : null}

      {response.outcome === 'abstained' ? (
        <div className="surface border-[var(--app-warning-border)] p-5 sm:p-6">
          <p className="flex items-center gap-2 text-base font-bold text-[var(--app-warning-text)]">
            <AlertTriangle size={17} aria-hidden="true" />
            No supported answer from the available sources
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {response.notice ??
              'The available sources did not support a reliable answer. Rengera is not guessing. You can search the law library or rephrase the question.'}
          </p>
          {response.answer ? (
            <div className="law-text mt-3">{response.answer}</div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/library" className="btn btn-secondary">
              <BookOpen size={15} aria-hidden="true" />
              Search the law library
            </Link>
            {onRetry ? (
              <button type="button" onClick={onRetry} className="btn btn-ghost">
                <RotateCw size={15} aria-hidden="true" />
                Try the question again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {response.outcome === 'unavailable' ? (
        <div
          role="alert"
          className="surface border-[var(--app-danger-border)] p-5 sm:p-6"
        >
          <p className="flex items-center gap-2 text-base font-bold text-[var(--app-danger-text)]">
            <AlertTriangle size={17} aria-hidden="true" />
            The answer service did not return a usable answer
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {response.notice ??
              'The service may not be enabled in this build. No answer was invented.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry ? (
              <button type="button" onClick={onRetry} className="btn btn-secondary">
                <RotateCw size={15} aria-hidden="true" />
                Try again
              </button>
            ) : null}
            <Link to="/library" className="btn btn-secondary">
              <BookOpen size={15} aria-hidden="true" />
              Read available laws
            </Link>
          </div>
        </div>
      ) : null}

      {hasEvidence ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
              <FileText size={15} aria-hidden="true" className="text-[var(--app-accent)]" />
              Evidence returned with this answer
            </h3>
            <span className="text-xs text-[var(--app-faint)]">
              {response.evidence.length}{' '}
              {response.evidence.length === 1 ? 'source' : 'sources'}
            </span>
          </div>
          <div className="mt-3 grid gap-3">
            {response.evidence.map((evidence, index) => (
              <EvidenceCard
                key={`${evidence.law_id ?? 'law'}:${evidence.article_number ?? index}`}
                evidence={evidence}
              />
            ))}
          </div>
        </div>
      ) : null}

      {response.limitations.length > 0 ? (
        <div className="border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]">
            Limitations reported by the service
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--app-text-2)]">
            {response.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.request_id ? (
        <p className="text-xs text-[var(--app-faint)]">
          Request ID: <span className="font-mono">{response.request_id}</span>
        </p>
      ) : null}
    </section>
  );
}
