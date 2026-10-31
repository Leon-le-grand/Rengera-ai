import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Languages,
  MessageSquare,
  ShieldAlert,
  Scale,
} from 'lucide-react';

import { RengeraMark } from '@/components/brand/RengeraMark';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Ask about a legal problem',
    body: 'Describe the situation in English, Kinyarwanda or French. A grounded answer must show the law and article it came from.',
    to: '/chat',
    linkLabel: 'Ask a question',
  },
  {
    icon: BookOpen,
    title: 'Read available source laws',
    body: 'Search the law library, open a law and read its articles. Status and classification-review information stay visible.',
    to: '/library',
    linkLabel: 'Open the library',
  },
  {
    icon: ShieldAlert,
    title: 'Reach urgent help directly',
    body: 'Immediate danger never waits for an AI response. Emergency contacts are local, account-free and available offline once loaded.',
    to: '/emergency',
    linkLabel: 'Emergency contacts',
  },
] as const;

export function LandingPage() {
  return (
    <div className="brand-radial relative overflow-hidden">
      <div
        aria-hidden="true"
        className="brand-grid pointer-events-none absolute inset-0 opacity-40"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rise-in">
            <p className="eyebrow">Rwandan legal information · V2 preview</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.02] tracking-[-0.035em] text-[var(--app-text)] sm:text-5xl lg:text-6xl">
              Find the law.
              <br />
              Understand{' '}
              <span className="text-[var(--app-accent)]">the source.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--app-muted)] sm:text-lg">
              Rengera helps you search available Rwandan laws, read the original
              article and see whether an answer is actually supported. No account is
              needed to ask or browse.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/chat" className="btn btn-primary min-h-12 px-5">
                Ask a question
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link to="/library" className="btn btn-secondary min-h-12 px-5">
                <BookOpen size={17} aria-hidden="true" />
                Browse the law library
              </Link>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--app-faint)]">
              <CheckCircle2
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--app-accent)]"
              />
              Legal information, not legal advice. Coverage is limited to sources
              available from the API and is never overstated.
            </p>
          </div>

          <div className="relative">
            <div className="surface overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-panel-2)] px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-[var(--app-danger-text)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--app-warning-text)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--app-success-text)]" />
                <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--app-faint)]">
                  Answer preview
                </span>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                    <RengeraMark size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--app-text)]">
                      What does the law say about this situation?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                      An answer only appears when the available sources support it.
                    </p>
                  </div>
                </div>

                <div className="border-l-2 border-[var(--app-accent-border)] pl-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent)]">
                    Source evidence
                  </p>
                  <div className="mt-2 border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-[var(--app-text)]">
                      <FileText size={13} aria-hidden="true" />
                      Law title and article
                    </p>
                    <div className="mt-2 space-y-1.5" aria-hidden="true">
                      <div className="skeleton h-2.5 w-full" />
                      <div className="skeleton h-2.5 w-11/12" />
                      <div className="skeleton h-2.5 w-8/12" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="chip">Status shown</span>
                      <span className="chip">Review state shown</span>
                    </div>
                  </div>
                </div>

                <div className="border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] px-3 py-2 text-[11px] leading-5 text-[var(--app-warning-text)]">
                  If the sources do not support an answer, Rengera says so and
                  points back to the library instead of guessing.
                </div>

                <div className="flex items-center justify-between border-t border-[var(--app-border)] pt-3 text-[10px] font-semibold text-[var(--app-faint)]">
                  <span className="flex items-center gap-1.5">
                    <Languages size={12} aria-hidden="true" />
                    English · Kinyarwanda · Français
                  </span>
                  <span>Source-linked</span>
                </div>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-3 -right-3 -z-10 h-full w-full border border-[var(--app-accent-border)]"
            />
          </div>
        </section>

        <section aria-labelledby="start-heading" className="mt-20">
          <div className="flex flex-col gap-2 border-b border-[var(--app-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Three ways in</p>
              <h2
                id="start-heading"
                className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--app-text)] sm:text-3xl"
              >
                Start where your question starts.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[var(--app-muted)]">
              Every route works without an account. Sign in only when you need the
              private account workspace.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="surface group flex flex-col p-5 transition-colors hover:border-[var(--app-accent-border)]"
                >
                  <span className="flex h-10 w-10 items-center justify-center border border-[var(--app-border-strong)] text-[var(--app-accent)]">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-[var(--app-text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[var(--app-muted)]">
                    {feature.body}
                  </p>
                  <Link
                    to={feature.to}
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--app-accent)]"
                  >
                    {feature.linkLabel}
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="truth-heading"
          className="mt-16 grid gap-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          <div>
            <p className="eyebrow">What this preview is</p>
            <h2
              id="truth-heading"
              className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--app-text)]"
            >
              Built to show its limits.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
              A legal assistant is only useful if you can tell what it knows, what
              it read and what it could not verify. The V2 preview is designed around
              that rule.
            </p>
            <Link
              to="/emergency"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--app-danger-text)] underline underline-offset-4"
            >
              <ShieldAlert size={15} aria-hidden="true" />
              In immediate danger? Call 112.
            </Link>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Scale,
                title: 'Source first',
                body: 'Answers cite the law and article used. Source text is kept separate from AI summaries.',
              },
              {
                icon: FileText,
                title: 'Status visible',
                body: 'Active, amended, repealed and review states are shown instead of assumed.',
              },
              {
                icon: MessageSquare,
                title: 'Honest abstention',
                body: 'When the available sources do not support an answer, the answer says so.',
              },
              {
                icon: ShieldAlert,
                title: 'Urgent routes stay open',
                body: 'Emergency guidance and 112 contacts never depend on a model response.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3.5"
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
                    <Icon
                      size={14}
                      aria-hidden="true"
                      className="text-[var(--app-accent)]"
                    />
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--app-muted)]">
                    {item.body}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[var(--app-border)] pt-6 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-xs leading-5 text-[var(--app-faint)]">
            Rengera is not a law firm and does not replace a qualified legal
            professional. For a decision that affects your rights, verify the source
            and seek advice.
          </p>
          <Link
            to="/library"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--app-accent)]"
          >
            Start with a source
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
