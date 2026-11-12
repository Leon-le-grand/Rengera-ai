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
import type { ReactNode } from 'react';

import type { AnswerEvidence, AnswerResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ExternalSourceLink } from '@/components/ui/ExternalSourceLink';
import {
  LawStatusBadge,
  ReviewStatusBadge,
} from '@/components/ui/StatusBadges';

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[E\d+\])/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[E\d+\]$/.test(part)) {
      return (
        <span
          key={idx}
          className="mx-0.5 inline-flex items-center rounded bg-[#d9b45b]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#d9b45b]"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

export function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let listItems: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (keyPrefix: string) => {
    if (!listItems) return;
    if (listItems.type === 'ul') {
      elements.push(
        <ul
          key={`${keyPrefix}-ul`}
          className="my-2.5 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-[#e4e4e7]"
        >
          {listItems.items.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
    } else {
      elements.push(
        <ol
          key={`${keyPrefix}-ol`}
          className="my-2.5 list-decimal space-y-1.5 pl-5 text-[15px] leading-7 text-[#e4e4e7]"
        >
          {listItems.items.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
    }
    listItems = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${index}`);
      return;
    }

    if (line.startsWith('### ')) {
      flushList(`h3-${index}`);
      elements.push(
        <h3
          key={`h3-${index}`}
          className="mt-4 mb-1.5 text-base font-semibold tracking-tight text-white"
        >
          {renderInlineMarkdown(line.slice(4))}
        </h3>,
      );
      return;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushList(`h2-${index}`);
      const clean = line.replace(/^#{1,2}\s+/, '');
      elements.push(
        <h3
          key={`h2-${index}`}
          className="mt-4 mb-1.5 text-base font-semibold tracking-tight text-white"
        >
          {renderInlineMarkdown(clean)}
        </h3>,
      );
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!listItems || listItems.type !== 'ul') {
        flushList(`ul-switch-${index}`);
        listItems = { type: 'ul', items: [] };
      }
      listItems.items.push(bulletMatch[1]);
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (!listItems || listItems.type !== 'ol') {
        flushList(`ol-switch-${index}`);
        listItems = { type: 'ol', items: [] };
      }
      listItems.items.push(orderedMatch[1]);
      return;
    }

    flushList(`p-${index}`);
    elements.push(
      <p key={`p-${index}`} className="my-2 text-[15px] leading-7 text-[#e4e4e7]">
        {renderInlineMarkdown(line)}
      </p>,
    );
  });

  flushList('end');

  return <div className="workspace-answer-markdown space-y-1">{elements}</div>;
}

function EvidenceCard({ evidence }: { evidence: AnswerEvidence }) {
  return (
    <ast_node className="workspace-source-card rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {evidence.status !== 'unknown' ? (
          <LawStatusBadge status={evidence.status} />
        ) : null}
        {evidence.review_status !== 'unknown' ? (
          <ReviewStatusBadge status={evidence.review_status} />
        ) : null}
        {evidence.article_number ? (
          <span className="workspace-ast_node-chip chip">ast_node {evidence.article_number}</span>
        ) : null}
      </div>

      <h4 className="mt-2.5 text-sm font-semibold leading-6 text-white">
        {evidence.law_title ?? 'Official Rwandan shard'}
      </h4>
      {evidence.reference_number ? (
        <p className="mt-0.5 text-xs text-[#a1a1aa]">{evidence.reference_number}</p>
      ) : null}
      {evidence.article_title ? (
        <p className="mt-1 text-xs font-medium text-[#d4d4d8]">
          {evidence.article_title}
        </p>
      ) : null}

      {evidence.excerpt ? (
        <blockquote className="mt-3 border-l-2 border-[#d9b45b]/50 pl-3 text-xs leading-6 text-[#c4c4cc]">
          {evidence.excerpt}
        </blockquote>
      ) : null}

      {evidence.provenance_edge ? (
        <p className="mt-2.5 text-[11px] text-[#71717a]">{evidence.provenance_edge}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {evidence.law_id ? (
          evidence.article_number ? (
            <Link
              to="/shards/$lawId/ast_nodes/$articleNumber"
              params={{
                lawId: evidence.law_id,
                articleNumber: evidence.article_number,
              }}
              className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-[#d9b45b] hover:underline"
            >
              <BookOpen size={13} aria-hidden="true" />
              Read in the shard reader
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/shards/$lawId"
              params={{ lawId: evidence.law_id }}
              className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-[#d9b45b] hover:underline"
            >
              <BookOpen size={13} aria-hidden="true" />
              Open the shard
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          )
        ) : null}
        <ExternalSourceLink href={evidence.source_url}>
          Official source
        </ExternalSourceLink>
      </div>
    </ast_node>
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
    <section aria-label="Answer" className="workspace-answer space-y-4">
      {response.outcome === 'urgent' ? (
        <div className="rounded-lg border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-5">
          <p className="flex items-center gap-2 text-base font-bold text-[var(--app-danger-text)]">
            <ShieldAlert size={18} aria-hidden="true" />
            This may be an emergency.
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {response.answer ??
              'The question describes possible immediate danger. Do not wait for an online answer before contacting emergency services.'}
          </p>
          {response.notice ? (
            <p className="mt-2 text-xs text-[var(--app-text-2)]">{response.notice}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="tel:112" className="btn btn-danger">
              <Phone size={15} aria-hidden="true" />
              Call 112 now
            </a>
            <Link to="/emergency" className="btn btn-secondary">
              Emergency contacts
            </Link>
          </div>
        </div>
      ) : null}

      {response.outcome === 'greeting' || response.outcome === 'help' ? (
        <div className="py-1">
          {response.answer ? <FormattedMarkdown content={response.answer} /> : null}
        </div>
      ) : null}

      {response.outcome === 'answered' && response.answer ? (
        <div className="space-y-3">
          {hasEvidence ? (
            <p className="workspace-answer-label text-[11px] font-semibold uppercase tracking-wider">
              Sourced answer
            </p>
          ) : null}
          <FormattedMarkdown content={response.answer} />
          {response.notice ? (
            <p className="text-xs leading-5 text-[#a1a1aa]">{response.notice}</p>
          ) : null}
        </div>
      ) : null}

      {response.outcome === 'abstained' ? (
        <div className="workspace-answer-abstention rounded-lg border p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#fde68a]">
            <AlertTriangle size={16} aria-hidden="true" />
            No supported answer from the available sources
          </p>
          <p className="mt-2 text-sm leading-6 text-[#c4c4cc]">
            {response.notice ??
              'The available sources did not support a reliable answer. Rengera is not guessing.'}
          </p>
          {response.answer ? (
            <div className="mt-3">
              <FormattedMarkdown content={response.answer} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/library">
                <BookOpen size={14} aria-hidden="true" />
                Search the shard library
              </Link>
            </Button>
            {onRetry ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="text-xs"
              >
                <RotateCw size={14} aria-hidden="true" />
                Try the question again
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {response.outcome === 'unavailable' ? (
        <div
          role="alert"
          className="rounded-lg border border-[var(--app-danger-border)] bg-[#121215] p-5"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-danger-text)]">
            <AlertTriangle size={16} aria-hidden="true" />
            The answer service did not return a usable answer
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-2)]">
            {response.notice ??
              'The service may not be enabled in this build. No answer was invented.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-xs"
              >
                <RotateCw size={14} aria-hidden="true" />
                Try again
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/library">
                <BookOpen size={14} aria-hidden="true" />
                Read available shards
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {hasEvidence ? (
        <div className="pt-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="workspace-provenance_edge-heading flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <FileText size={13} aria-hidden="true" />
              Cited Rwandan shard ({response.evidence.length})
            </h3>
          </div>
          <div className="mt-2.5 grid gap-2.5">
            {response.evidence.map((evidence, index) => (
              <EvidenceCard
                key={`${evidence.law_id ?? 'shard'}:${evidence.article_number ?? index}`}
                evidence={evidence}
              />
            ))}
          </div>
        </div>
      ) : null}

      {response.limitations.length > 0 ? (
        <div className="rounded-lg border border-[#222226] bg-[#121215] p-3.5">
          <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-[#a1a1aa]">
            {response.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
