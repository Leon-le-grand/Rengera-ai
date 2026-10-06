'use client';

/**
 * Shared chat surface.
 *
 * This is a faithful port of the "chat-template-desktop" reference: the same
 * window chrome (title + Private pill + icon rail), the same airy message
 * column (indigo context chip, gray user bubble with avatar on the right, plain
 * assistant copy with inline citation chips), the same status rows (Thought /
 * Viewed / Generating), the same "N results" source list, and the same composer
 * with the model pill, tool rail, mic and the blue send button.
 *
 * Both the live product chat (`components/app/ChatInterface.tsx`) and the static
 * landing showcase render these primitives, so the two can never drift apart.
 */

import type { ReactNode } from 'react';
import {
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  Eye,
  FileText,
  Lightbulb,
  Lock,
  Plus,
  UserRound,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

export const CHAT_ACCENT = '#1a73e8';
export const CHAT_CHIP = '#4f46e5';

/** Page-level backdrop that surrounds the chat window. */
export function ChatBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-full w-full items-center justify-center bg-[radial-gradient(120%_90%_at_50%_0%,#f4f4f4_0%,#e6e6e6_55%,#dedede_100%)]',
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
        'relative flex w-full flex-col overflow-hidden rounded-[3px]',
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
  privateLabel = 'Private',
  onNewChat,
  onEdit,
  onShare,
  onMore,
  onClose,
  actions,
  children,
}: {
  title?: string;
  privateLabel?: string;
  onNewChat?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  onClose?: () => void;
  /** Optional custom icon rail (the app swaps this in for its own controls). */
  actions?: ReactNode;
  /** Extra controls rendered between the title and the icon rail. */
  children?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onNewChat}
          className="group flex shrink-0 items-center gap-1 text-[13px] font-semibold tracking-[-0.01em] text-[var(--chat-text)] outline-none transition-opacity hover:opacity-70"
        >
          <span className="truncate">{title}</span>
          <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--chat-muted)]" />
        </button>

        <span className="hidden items-center gap-1 rounded-full bg-[var(--chat-chip)] px-2 py-[3px] text-[11px] font-medium text-[var(--chat-muted)] sm:inline-flex">
          <Lock size={10} strokeWidth={2.5} />
          {privateLabel}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {children}
        {actions ?? (
          <button
            type="button"
            onClick={onShare}
            className="rounded-full border border-[var(--chat-border)] px-3.5 py-[7px] text-[12px] font-medium text-[var(--chat-text)] outline-none transition-colors hover:bg-[var(--chat-hover)] active:bg-[var(--chat-chip)]"
          >
            Share
          </button>
        )}
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
      <div className="max-w-[85%] rounded-[20px] bg-[var(--chat-user)] px-4 py-2.5 text-[13px] leading-[1.55] text-[var(--chat-text)]">
        {children}
      </div>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-chip)] text-[var(--chat-muted)]">
        {avatar ?? <UserRound size={13} strokeWidth={2.25} />}
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
        'text-[13px] leading-[1.65] text-[var(--chat-text)] [&_a]:text-[#1a73e8] [&_a]:underline [&_a]:underline-offset-2',
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
    <span className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-[5px] bg-[var(--chat-chip)] px-1.5 py-[1px] align-middle text-[10px] font-medium text-[var(--chat-muted)]">
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
        <span className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--chat-blue-soft)] px-2 py-[2px] text-[11px] font-medium text-[var(--chat-blue)]">
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
  className,
}: {
  countLabel: string;
  items: { key: string; title: string; icon?: ReactNode; active?: boolean; verified?: boolean }[];
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('mt-1', className)}>
      <p className="mb-1.5 text-[11px] text-[var(--chat-muted-2)]">{countLabel}</p>
      <ul className="divide-y divide-[var(--chat-chip)]">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect?.(item.key)}
              className={cn(
                'flex w-full items-center gap-2.5 py-2 text-left text-[13px] text-[var(--chat-text)] outline-none transition-colors hover:underline',
                item.active && 'font-semibold',
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--chat-chip)] text-[var(--chat-muted)]">
                {item.icon ?? <FileText size={12} strokeWidth={2} />}
              </span>
              <span className="min-w-0 truncate">{item.title}</span>
              {item.verified && (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-[1px] text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck size={9} strokeWidth={3} />
                  Verified
                </span>
              )}
            </button>
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
        className="pointer-events-auto flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--chat-border)] bg-[var(--chat-panel)] text-[var(--chat-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.12)] outline-none transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
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
      <div className="mx-auto w-full max-w-[820px]">
        {emergency}
        <div className="rounded-[26px] border border-[var(--chat-border)] bg-[var(--chat-composer)] p-3 transition-colors focus-within:border-[var(--chat-border)] focus-within:bg-[var(--chat-panel)]">
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--chat-border-soft)] bg-[var(--chat-panel)] py-1 pl-1 pr-2">
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

/**
 * The composer rail is deliberately minimal: attach, type, send. The model
 * picker, web search, assistant sparkle and overflow menu were decoration that
 * did nothing, so they are gone rather than left as dead controls.
 */
export function ComposerToolbar({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <ComposerAction label="Add attachment" onClick={onAdd}>
        <Plus size={16} strokeWidth={2.25} />
      </ComposerAction>
    </div>
  );
}

function ComposerAction({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--chat-muted)] outline-none transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
    >
      {children}
    </button>
  );
}

export function ComposerActions({
  onSend,
  sendDisabled,
  sending,
  className,
}: {
  onSend?: () => void;
  sendDisabled?: boolean;
  sending?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mt-2 flex items-center justify-end gap-2', className)}>
      <button
        type="button"
        aria-label="Send message"
        onClick={onSend}
        disabled={sendDisabled}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white outline-none transition-all hover:brightness-110 disabled:opacity-35"
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
    <p className="mx-auto mt-2.5 max-w-[820px] px-4 text-center text-[10px] text-[var(--chat-muted-2)]">
      {children}
    </p>
  );
}