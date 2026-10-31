import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function ErrorState({
  title,
  message,
  requestId,
  onRetry,
  retryLabel = 'Try again',
  className,
  children,
}: {
  title: string;
  message: string;
  requestId?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'surface border-[var(--app-danger-border)] p-6 text-left',
        className,
      )}
    >
      <h2 className="text-lg font-bold text-[var(--app-text)]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-text-2)]">
        {message}
      </p>
      {requestId ? (
        <p className="mt-2 break-all text-xs text-[var(--app-muted)]">
          Request ID: <span className="font-mono">{requestId}</span>
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-4">
          <RotateCw size={15} aria-hidden="true" />
          {retryLabel}
        </button>
      ) : null}
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  className,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface px-6 py-10 text-center', className)}>
      <h2 className="text-lg font-bold text-[var(--app-text)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
        {message}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({
  title,
  message,
  className,
}: {
  title: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('surface px-6 py-10 text-center', className)}>
      <div
        className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-[var(--app-border-strong)] border-t-[var(--app-accent)]"
        aria-hidden="true"
      />
      <p role="status" className="text-sm font-semibold text-[var(--app-text)]">
        {title}
      </p>
      {message ? (
        <p className="mx-auto mt-1 max-w-xl text-sm text-[var(--app-muted)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="skeleton h-4"
          style={{ width: `${88 - index * 12}%` }}
        />
      ))}
    </div>
  );
}
