import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type NoticeTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const TONE_CLASSES: Record<NoticeTone, string> = {
  info: 'border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-text-2)]',
  warning:
    'border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] text-[var(--app-warning-text)]',
  danger:
    'border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] text-[var(--app-danger-text)]',
  success:
    'border-[var(--app-success-border)] bg-[var(--app-success-bg)] text-[var(--app-success-text)]',
  neutral:
    'border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text-2)]',
};

export function InlineNotice({
  tone = 'neutral',
  title,
  children,
  className,
  role,
}: {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  className?: string;
  role?: 'status' | 'alert' | 'note';
}) {
  return (
    <div
      role={role}
      className={cn(
        'border px-4 py-3 text-sm leading-6',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {title ? <p className="mb-1 font-bold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
