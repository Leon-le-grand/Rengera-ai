import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import { safeHttpUrl } from '@/lib/safe-url';

export function ExternalSourceLink({
  href,
  children = 'Open official source',
  className = '',
}: {
  href: string | null | undefined;
  children?: ReactNode;
  className?: string;
}) {
  const safeHref = safeHttpUrl(href);
  if (!safeHref) return null;

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--app-accent)] underline decoration-[var(--app-accent-border)] underline-offset-4 hover:decoration-[var(--app-accent)] ${className}`}
    >
      <ExternalLink size={14} aria-hidden="true" />
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
