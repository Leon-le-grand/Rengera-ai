import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, BookOpen, ExternalLink, MessageSquare, ShieldAlert } from 'lucide-react';

import { getSharedConsultationOptions } from '@/api/generated/@tanstack/react-query.gen';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/States';

export function SharedConsultationPage({ shareToken }: { shareToken: string }) {
  const { data, isLoading, isError, error } = useQuery(
    getSharedConsultationOptions({
      path: { share_token: shareToken },
    }),
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="surface animate-pulse p-8">
          <div className="h-4 w-1/4 rounded bg-[var(--app-line)]" />
          <div className="mt-4 h-8 w-3/4 rounded bg-[var(--app-line)]" />
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full rounded bg-[var(--app-line)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--app-line)]" />
            <div className="h-4 w-2/3 rounded bg-[var(--app-line)]" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ErrorState
          title="Shared Consultation Unavailable"
          message={
            error instanceof Error
              ? error.message
              : 'This shared legal consultation could not be found or has expired.'
          }
        >
          <div className="mt-6 flex gap-4">
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={16} aria-hidden="true" />
              Return Home
            </Link>
            <Link to="/chat" className="btn btn-primary">
              <MessageSquare size={16} aria-hidden="true" />
              Ask a Legal Question
            </Link>
          </div>
        </ErrorState>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Rengera AI · Shared Consultation"
        title="Shared Legal Inquiry"
        description="Publicly shared legal question and source-grounded response."
      />

      <div className="mt-8 space-y-6">
        {/* Question card */}
        <section className="surface p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-gold)]">
            operator Question
          </h2>
          <p className="mt-2 text-lg font-medium text-[var(--app-text)]">
            {data.question}
          </p>
          <p className="mt-2 text-xs text-[var(--app-muted)]">
            Shared on {new Date(data.created_at).toLocaleDateString()} · {data.view_count} views
          </p>
        </section>

        {/* Answer card */}
        <section className="surface p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-gold)]">
            Grounded Answer
          </h2>
          <div className="prose mt-3 max-w-none text-sm leading-relaxed text-[var(--app-text)] whitespace-pre-wrap">
            {data.answer}
          </div>
        </section>

        {/* Sources section */}
        {data.sources && data.sources.length > 0 ? (
          <section className="surface p-6">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--app-gold)]">
              <BookOpen size={14} aria-hidden="true" />
              Cited Statutory Sources
            </h2>
            <ul className="mt-4 space-y-3">
              {data.sources.map((source, idx) => {
                const provenance_edge =
                  typeof source.provenance_edge === 'string' && source.provenance_edge.trim()
                    ? source.provenance_edge
                    : 'Statutory provenance_edge';
                const sourceUrl =
                  typeof source.source_url === 'string' && source.source_url.startsWith('https://')
                    ? source.source_url
                    : null;

                return (
                  <li
                    key={idx}
                    className="flex items-start justify-between rounded border border-[var(--app-line)] bg-[var(--app-canvas)] p-3 text-sm"
                  >
                    <span className="font-medium text-[var(--app-text)]">{provenance_edge}</span>
                    {sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[var(--app-gold)] hover:underline"
                      >
                        Source <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* Legal Disclaimer */}
        <div className="flex items-start gap-3 rounded border border-[var(--app-line)] bg-[var(--app-canvas)] p-4 text-xs text-[var(--app-muted)]">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[var(--app-gold)]" aria-hidden="true" />
          <p>
            Rengera AI provides informational guidance based directly on Rwandan statutes. It does not provide official legal counsel or representation. For formal legal matters, consult a qualified Rwandan attorney.
          </p>
        </div>

        {/* Action Callout */}
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/chat" className="btn btn-primary">
            <MessageSquare size={16} aria-hidden="true" />
            Ask your own question
          </Link>
          <Link to="/library" className="btn btn-secondary">
            <BookOpen size={16} aria-hidden="true" />
            Browse shard Library
          </Link>
        </div>
      </div>
    </main>
  );
}
