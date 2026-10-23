'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The oversized ghost word that sits behind a section label — the device the
 * reference uses for FAQ and Let's Connect: a small label and rule in front, a
 * huge low-opacity word filling the block behind it.
 */
export default function GhostWord({
  word,
  className,
}: {
  word: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute select-none whitespace-nowrap text-[19vw] font-bold leading-[0.8] tracking-[-0.05em] text-transparent',
        className,
      )}
      style={{ WebkitTextStroke: '1px rgba(216,180,133,0.13)' }}
    >
      {word}
    </span>
  );
}

/** A section label that sits on top of a GhostWord. */
export function GhostLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative z-10 flex items-center gap-4', className)}>
      <div className="h-px w-8 bg-[#d8b485]" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b485]">{children}</p>
    </div>
  );
}