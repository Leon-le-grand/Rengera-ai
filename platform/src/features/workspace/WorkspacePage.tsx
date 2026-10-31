import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import { CAPABILITIES } from '@/auth/capabilities';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { InlineNotice } from '@/components/ui/InlineNotice';

type WorkspaceKind = 'staff' | 'admin';

const WORKSPACE_COPY: Record<
  WorkspaceKind,
  {
    eyebrow: string;
    title: string;
    description: string;
    capability: string;
    planned: { title: string; body: string }[];
  }
> = {
  staff: {
    eyebrow: 'Staff workspace',
    title: 'Staff tools are guarded, not simulated.',
    description:
      'This workspace exists in the V2 frontend to prove the authenticated capability path. The staff API contract has not been defined yet, so no review queue or ingestion controls are rendered.',
    capability: CAPABILITIES.lawDraft,
    planned: [
      {
        title: 'Ingestion intake',
        body: 'Upload and monitor source-law ingestion jobs with explicit status and failure reporting.',
      },
      {
        title: 'Source review',
        body: 'Inspect extracted articles, OCR warnings and derived metadata before review.',
      },
      {
        title: 'Answer review',
        body: 'Review flagged answers against their evidence without editing source text.',
      },
      {
        title: 'Workflow tasks',
        body: 'Assign and track bounded review work with an auditable state history.',
      },
    ],
  },
  admin: {
    eyebrow: 'Admin workspace',
    title: 'Administration is a guarded shell in this build.',
    description:
      'The admin route verifies the account capability before rendering. Staff management, workflows and analytics stay out of the UI until their endpoints are defined and the server checks every action.',
    capability: CAPABILITIES.lawPublish,
    planned: [
      {
        title: 'Staff administration',
        body: 'Invite, suspend and scope staff accounts through server-verified permissions.',
      },
      {
        title: 'Review oversight',
        body: 'See review queues, ageing work and classification status without bypassing source fidelity.',
      },
      {
        title: 'Workflow configuration',
        body: 'Manage bounded workflows with explicit states, owners and retention rules.',
      },
      {
        title: 'Service analytics',
        body: 'Read operational metrics that distinguish unavailable, abstained and answered requests.',
      },
    ],
  },
};

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  const auth = useAuth();
  const copy = WORKSPACE_COPY[kind];

  const hasCapability = auth.capabilities.includes(copy.capability);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <Link to="/settings" className="btn btn-secondary">
            <KeyRound size={15} aria-hidden="true" />
            Account settings
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="surface p-5" aria-labelledby="access-status-heading">
          <h2
            id="access-status-heading"
            className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]"
          >
            <ShieldCheck size={16} aria-hidden="true" className="text-[var(--app-accent)]" />
            Access state
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--app-text-2)]">
            <p className="flex items-start gap-2">
              <CheckCircle2
                size={15}
                aria-hidden="true"
                className="mt-1 shrink-0 text-[var(--app-success-text)]"
              />
              {auth.user ? `Signed in as ${auth.user.display_name}.` : 'Session verified.'}
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2
                size={15}
                aria-hidden="true"
                className="mt-1 shrink-0 text-[var(--app-success-text)]"
              />
              {hasCapability
                ? `Capability ${copy.capability} is present.`
                : 'The expected capability was not present in the client snapshot.'}
            </p>
            <p className="flex items-start gap-2 text-[var(--app-muted)]">
              <CircleDashed size={15} aria-hidden="true" className="mt-1 shrink-0" />
              The API still checks every request. This screen is presentation only.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {auth.capabilities.length > 0 ? (
              auth.capabilities.map((capability) => (
                <span key={capability} className="chip font-mono">
                  {capability}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--app-faint)]">
                No capabilities supplied
              </span>
            )}
          </div>
        </section>

        <section className="surface p-5" aria-labelledby="contract-status-heading">
          <h2
            id="contract-status-heading"
            className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]"
          >
            <CircleDashed size={16} aria-hidden="true" className="text-[var(--app-warning-text)]" />
            Integration status
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--app-muted)]">
            <li>Frontend route and capability guard: present.</li>
            <li>
              Versioned OpenAPI document: present, but it defines only health,
              readiness and API metadata.
            </li>
            <li>
              Generated API client: generated for those foundation endpoints.
              Session, law and answer endpoints are not in the contract yet.
            </li>
            <li>Workspace data and actions: not connected.</li>
          </ul>
          <InlineNotice tone="neutral" className="mt-4">
            No placeholder rows, fake queues or invented counts are shown. An empty
            shell is more honest than a convincing mock.
          </InlineNotice>
        </section>
      </div>

      <section aria-labelledby="planned-heading" className="mt-8">
        <div className="flex items-end justify-between gap-3 border-b border-[var(--app-border)] pb-3">
          <h2
            id="planned-heading"
            className="text-lg font-bold text-[var(--app-text)]"
          >
            Planned scope
          </h2>
          <span className="text-xs text-[var(--app-faint)]">Not connected</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {copy.planned.map((item) => (
            <article
              key={item.title}
              className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-2)] p-4"
            >
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
                {kind === 'staff' ? (
                  <Wrench size={14} aria-hidden="true" className="text-[var(--app-muted)]" />
                ) : (
                  <ShieldCheck
                    size={14}
                    aria-hidden="true"
                    className="text-[var(--app-muted)]"
                  />
                )}
                {item.title}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[var(--app-muted)]">
                {item.body}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-warning-text)]">
                Waiting for API contract
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--app-border)] pt-4">
        <button
          type="button"
          onClick={() => void auth.refresh()}
          disabled={auth.refreshing}
          className="btn btn-secondary"
        >
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={auth.refreshing ? 'animate-spin' : undefined}
          />
          {auth.refreshing ? 'Checking…' : 'Recheck session'}
        </button>
        <Link to="/library" className="btn btn-ghost">
          <BookOpen size={15} aria-hidden="true" />
          Law library
        </Link>
        {kind === 'admin' ? (
          <Link to="/staff" className="btn btn-ghost">
            Staff workspace
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
