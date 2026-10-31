import type { LawStatus, ReviewStatus } from '@/api/types';
import { cn } from '@/lib/cn';

const STATUS_LABELS: Record<LawStatus, string> = {
  active: 'Active',
  amended: 'Amended',
  repealed: 'Repealed',
  unknown: 'Status not recorded',
};

const STATUS_CLASSES: Record<LawStatus, string> = {
  active:
    'border-[var(--app-success-border)] bg-[var(--app-success-bg)] text-[var(--app-success-text)]',
  amended:
    'border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] text-[var(--app-warning-text)]',
  repealed:
    'border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] text-[var(--app-danger-text)]',
  unknown:
    'border-[var(--app-border-strong)] bg-[var(--app-panel-2)] text-[var(--app-muted)]',
};

export function LawStatusBadge({
  status,
  className,
}: {
  status: LawStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  reviewed: 'Classification reviewed',
  pending: 'Classification not reviewed',
  unknown: 'Review state not recorded',
  unavailable: 'Review state unavailable',
};

const REVIEW_CLASSES: Record<ReviewStatus, string> = {
  reviewed:
    'border-[var(--app-success-border)] text-[var(--app-success-text)]',
  pending: 'border-[var(--app-warning-border)] text-[var(--app-warning-text)]',
  unknown: 'border-[var(--app-border-strong)] text-[var(--app-muted)]',
  unavailable: 'border-[var(--app-border-strong)] text-[var(--app-muted)]',
};

export function ReviewStatusBadge({
  status,
  className,
}: {
  status: ReviewStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]',
        REVIEW_CLASSES[status],
        className,
      )}
    >
      {REVIEW_LABELS[status]}
    </span>
  );
}

export function statusLabel(status: LawStatus): string {
  return STATUS_LABELS[status];
}

export function reviewStatusLabel(status: ReviewStatus): string {
  return REVIEW_LABELS[status];
}
