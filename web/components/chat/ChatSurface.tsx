'use client';

/** Shared, source-first chat primitives used by the live workspace. */

import type { ReactNode } from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Eye,
  FileText,
  Lightbulb,
  UserRound,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

export const CHAT_ACCENT = 'var(--chat-accent)';
export const CHAT_CHIP = 'var(--chat-chip)';

/** Page-level backdrop that surrounds the chat window. */
export function ChatBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-full w-full items-center justify-center bg-[var(--chat-surround)]',
        className,
      )}
    />
  );
}

/** The rounded application window itself. */
export function ChatFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-[3px] border border-[var(--chat-border)] bg-[var(--chat-panel)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export function ChatTopBar({
  title = 'New Rengera chat',
  children,
}: {
  title?: string;
  /** Accessible workspace actions, supplied by the live chat. */
  children?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--chat-border)] px-3 py-2.5 sm:px-5">
      <h1 className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--chat-text)] sm:text-[15px]">
        {title}
      </h1>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {children}
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  filled,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full text-[var(--chat-muted)] outline-none transition-colors hover:bg-[var(--chat-chip)] hover:text-[var(--chat-text)]',
        filled && 'bg-[var(--chat-chip)]',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Message column                                                      */
/* ------------------------------------------------------------------ */

export function ChatStream({ children }: { children: ReactNode }) {
  return (
    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-3 pb-5 pt-2 sm:px-5">
        {children}
      </div>
    </div>
  );
}

/** Indigo context chip that sits above the user's question. */
export function ContextChip({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex justify-end', className)}>
      <span
        className="inline-flex items-center gap-1.5 rounded-[7px] px-2 py-[3px] text-[11px] font-medium text-white"
        style={{ backgroundColor: CHAT_CHIP }}
      >
        {icon ?? <FileText size={11} strokeWidth={2.5} />}
        {children}
      </span>
    </div>
  );
}

/** Gray pill with the avatar pinned to its right. */
export function UserBubble({
  children,
  avatar,
  className,
}: {
  children: ReactNode;
  avatar?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-end gap-2.5', className)}>
      <div className="max-w-[85%] border border-[var(--chat-border)] bg-[var(--chat-user)] px-4 py-2.5 text-sm font-medium leading-[1.55] text-[var(--chat-text)]">
        {children}
      </div>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-chip)] text-[var(--chat-muted)]">
        {avatar ?? <UserRound size={14} strokeWidth={2.25} />}
      </div>
    </div>
  );
}

/** Assistant copy: no bubble, no avatar, generous left column. */
export function AssistantBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-sm font-medium leading-[1.7] text-[var(--chat-text)] [&_a]:text-[var(--chat-accent)] [&_a]:underline [&_a]:underline-offset-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AssistantHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-4 mb-1.5 text-[14px] font-semibold tracking-[-0.01em] text-[var(--chat-text)] first:mt-0">
      {children}
    </h3>
  );
}

/** Small inline citation token that trails a sentence. */
export function CitationChip({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 border border-[var(--chat-border)] bg-[var(--chat-chip)] px-1.5 py-[1px] align-middle text-[10px] font-medium text-[var(--chat-muted)]">
      <FileText size={9} strokeWidth={2.5} />
      {children}
    </span>
  );
}

export function BulletList({ children }: { children: ReactNode }) {
  return (
    <ul className="my-2 space-y-1.5">
      {children}
    </ul>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--chat-muted)]" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Status rows                                                         */
/* ------------------------------------------------------------------ */

export function StatusRow({
  icon,
  children,
  trailing,
}: {
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--chat-muted)]">
      <span className="flex h-4 w-4 items-center justify-center text-[var(--chat-muted)]">{icon}</span>
      <span className="truncate">{children}</span>
      {trailing}
    </div>
  );
}

export function ThoughtRow({ label = 'Thought' }: { label?: string }) {
  return (
    <StatusRow icon={<Lightbulb size={13} strokeWidth={2} />}>
      <span className="flex items-center gap-0.5">
        {label}
        <ChevronDown size={12} strokeWidth={2.5} className="-rotate-90" />
      </span>
    </StatusRow>
  );
}

export function ViewedRow({ label = 'Viewed', source }: { label?: string; source: string }) {
  return (
    <StatusRow
      icon={<Eye size={13} strokeWidth={2} />}
      trailing={
        <span className="inline-flex items-center gap-1 border border-[var(--chat-border)] bg-[var(--chat-accent-soft)] px-2 py-[2px] text-[11px] font-medium text-[var(--chat-accent)]">
          <FileText size={10} strokeWidth={2.5} />
          {source}
        </span>
      }
    >
      {label}
    </StatusRow>
  );
}

export function GeneratingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--chat-muted)]">
      <Loader2 size={13} strokeWidth={2} className="animate-spin text-[var(--chat-muted)]" />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export function SourceList({
  countLabel,
  items,
  onSelect,
  openArticleLabel,
  officialSourceLabel,
  className,
}: {
  countLabel: string;
  items: {
    key: string;
    title: string;
    subtitle?: string;
    statusLabel: string;
    reviewLabel: string;
    sourceUrl?: string | null;
    active?: boolean;
  }[];
  onSelect?: (key: string) => void;
  openArticleLabel: string;
  officialSourceLabel: string;
  className?: string;
}) {
  return (
    <div className={cn('mt-1', className)}>
      <p className="mb-2 text-[11px] font-semibold text-[var(--chat-muted)]">{countLabel}</p>
      <ul className="divide-y divide-[var(--chat-border)] border-y border-[var(--chat-border)]">
        {items.map((item) => (
          <li key={item.key} className="py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <button
                type="button"
                onClick={() => onSelect?.(item.key)}
                aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
                className={cn(
                  'flex min-w-0 items-start gap-2.5 text-left text-[13px] text-[var(--chat-text)] transition-colors hover:text-[var(--chat-accent)]',
                  item.active && 'font-semibold',
                )}
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--chat-border)] bg-[var(--chat-chip)] text-[var(--chat-accent)]">
                  <FileText size={13} strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-5">{item.title}</span>
                  {item.subtitle && <span className="mt-0.5 block text-[11px] font-normal leading-4 text-[var(--chat-muted)]">{item.subtitle}</span>}
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--chat-accent)]">
                    {openArticleLabel}
                    <ArrowUpRight size={12} strokeWidth={2} />
                  </span>
                </span>
              </button>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  aria-label={`${officialSourceLabel}: ${item.title}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-[38px] shrink-0 text-[11px] font-semibold text-[var(--chat-accent)] underline underline-offset-4 sm:ml-0"
                >
                  {officialSourceLabel}
                </a>
              )}
            </div>
            <div className="ml-[38px] mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] leading-4 text-[var(--chat-muted)] sm:ml-[38px]">
              <span>{item.statusLabel}</span>
              <span>{item.reviewLabel}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Floating "jump to latest" button that sits above the composer. */
export function ScrollDownButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('pointer-events-none relative flex justify-center', className)}>
      <button
        type="button"
        aria-label="Scroll to latest"
        onClick={onClick}
        className="pointer-events-auto flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-[var(--chat-border)] bg-[var(--chat-panel)] text-[var(--chat-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.12)] outline-none transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
      >
        <ChevronDown size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

export function ComposerFrame({
  children,
  emergency,
  className,
}: {
  children: ReactNode;
  emergency?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('shrink-0 px-4 pb-3 pt-1 sm:px-6', className)}>
      <div className="mx-auto w-full max-w-[980px]">
        {emergency}
        <div className="border border-[var(--chat-border)] bg-[var(--chat-composer)] p-3 transition-colors focus-within:border-[var(--chat-accent)] focus-within:bg-[var(--chat-panel)] sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ComposerChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-[var(--chat-border-soft)] bg-[var(--chat-panel)] py-1 pl-1 pr-2">
      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-chip)] text-[var(--chat-muted)]">
        <UserRound size={12} strokeWidth={2.25} />
      </span>
      <span className="text-[12px] font-medium text-[var(--chat-text-2)]">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="ml-0.5 text-[var(--chat-muted-2)] outline-none transition-colors hover:text-[var(--chat-text)]"
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </span>
  );
}

export function ComposerActions({
  onSend,
  sendDisabled,
  sending,
  sendLabel,
  sendingLabel,
  className,
}: {
  onSend?: () => void;
  sendDisabled?: boolean;
  sending?: boolean;
  sendLabel: string;
  sendingLabel: string;
  className?: string;
}) {
  return (
    <div className={cn('mt-2 flex items-center justify-end gap-2', className)}>
      <button
        type="button"
        aria-label={sending ? sendingLabel : sendLabel}
        title={sending ? sendingLabel : sendLabel}
        onClick={onSend}
        disabled={sendDisabled}
        className="flex h-11 min-w-11 items-center justify-center border border-[var(--chat-accent)] text-[var(--app-bg)] outline-none transition-colors hover:brightness-110 disabled:opacity-35"
        style={{ backgroundColor: CHAT_ACCENT }}
      >
        {sending ? (
          <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
        ) : (
          <ArrowUp size={17} strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}

export function ChatDisclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto mt-2.5 max-w-[820px] px-4 text-center text-[11px] font-medium text-[var(--chat-muted-2)]">
      {children}
    </p>
  );
}
