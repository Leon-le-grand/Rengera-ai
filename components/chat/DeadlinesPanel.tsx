'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlarmClock, Check, Plus, Trash2, X } from 'lucide-react';
import {
  createDeadline,
  listDeadlines,
  removeDeadline,
  setDeadlineStatus,
  type DeadlineRecord,
} from '@/app/product-actions';
import { cn } from '@/lib/utils';

/**
 * Deadline tracker.
 *
 * A legal answer is a one-time visit; a deadline is a reason to come back. This
 * panel keeps both a server copy (so it survives a device change) and a local
 * mirror (so it still works when the database is unreachable).
 */

const LOCAL_KEY = 'rengera_deadlines_v1';

interface LocalDeadline extends DeadlineRecord {
  local?: boolean;
}

function readLocal(): LocalDeadline[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as LocalDeadline[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(deadlines: LocalDeadline[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(deadlines.filter((item) => item.local)));
  } catch {
    // Non-fatal.
  }
}

function daysLeft(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function urgencyTone(days: number): string {
  if (days < 0) return 'bg-red-50 text-red-700 ring-red-200';
  if (days <= 3) return 'bg-red-50 text-red-700 ring-red-200';
  if (days <= 7) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

export default function DeadlinesPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [deadlines, setDeadlines] = useState<LocalDeadline[]>([]);
  const [label, setLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const local = readLocal();
    try {
      const result = await listDeadlines();
      if (result.success) {
        const merged: LocalDeadline[] = [...result.deadlines];
        for (const item of local) {
          if (!merged.some((row) => row.label === item.label && row.due_date === item.due_date)) {
            merged.push(item);
          }
        }
        setDeadlines(merged.sort((a, b) => a.due_date.localeCompare(b.due_date)));
        return;
      }
    } catch {
      // Fall through to local state.
    }
    setDeadlines(local.sort((a, b) => a.due_date.localeCompare(b.due_date)));
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const add = async () => {
    if (!label.trim() || !dueDate) return;
    setSaving(true);

    const record: LocalDeadline = {
      id: `local-${Date.now()}`,
      label: label.trim(),
      note: null,
      due_date: dueDate,
      status: 'open',
      source_law_title: null,
      source_article: null,
      local: true,
    };

    const result = await createDeadline({ label: record.label, dueDate: record.due_date });
    const next = [...deadlines, record];
    setDeadlines(next.sort((a, b) => a.due_date.localeCompare(b.due_date)));
    writeLocal(next);
    setLabel('');
    setDueDate('');
    setSaving(false);

    if (!result.success) {
      // Already mirrored locally, so nothing is lost.
      return;
    }
    void refresh();
  };

  const toggle = async (deadline: LocalDeadline) => {
    const status: DeadlineRecord['status'] = deadline.status === 'done' ? 'open' : 'done';
    const next: LocalDeadline[] = deadlines.map((item) =>
      item.id === deadline.id ? { ...item, status } : item,
    );
    setDeadlines(next);
    writeLocal(next);
    if (!deadline.local) await setDeadlineStatus(deadline.id, status);
  };

  const remove = async (deadline: LocalDeadline) => {
    const next = deadlines.filter((item) => item.id !== deadline.id);
    setDeadlines(next);
    writeLocal(next);
    if (!deadline.local) await removeDeadline(deadline.id);
  };

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-black/20" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col border-l border-[var(--chat-border-soft)] bg-white"
      >
        <div className="flex items-center justify-between border-b border-[var(--chat-chip)] px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--chat-text)]">
            <AlarmClock size={15} strokeWidth={2} className="text-[#1a73e8]" />
            Your deadlines
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deadlines"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-chip)]"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="border-b border-[var(--chat-chip)] p-4">
          <div className="flex flex-col gap-2">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="What must you do?"
              className="w-full rounded-[10px] border border-[var(--chat-border)] px-3 py-2 text-[12px] text-[var(--chat-text)] outline-none placeholder:text-[var(--chat-muted-2)] focus:border-[#1a73e8]"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="flex-1 rounded-[10px] border border-[var(--chat-border)] px-3 py-2 text-[12px] text-[var(--chat-text)] outline-none focus:border-[#1a73e8]"
              />
              <button
                type="button"
                onClick={add}
                disabled={saving || !label.trim() || !dueDate}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1a73e8] px-3 py-2 text-[12px] font-medium text-white transition-opacity disabled:opacity-40"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
          {deadlines.length === 0 ? (
            <p className="mt-8 text-center text-[12px] leading-5 text-[var(--chat-muted-2)]">
              No deadlines yet. When an answer mentions a time limit, use “Add reminder” under that
              answer and it will show up here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {deadlines.map((deadline) => {
                const days = daysLeft(deadline.due_date);
                const done = deadline.status === 'done';

                return (
                  <li
                    key={deadline.id}
                    className="flex items-start gap-3 rounded-[14px] border border-[var(--chat-chip)] p-3"
                  >
                    <button
                      type="button"
                      onClick={() => void toggle(deadline)}
                      aria-label={done ? 'Mark as open' : 'Mark as done'}
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                        done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-[var(--chat-border)] text-transparent hover:border-emerald-400',
                      )}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-[13px] font-medium text-[var(--chat-text)]',
                          done && 'text-[var(--chat-muted-2)] line-through',
                        )}
                      >
                        {deadline.label}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-[2px] text-[11px] font-medium ring-1',
                            done ? 'bg-slate-100 text-slate-500 ring-slate-200' : urgencyTone(days),
                          )}
                        >
                          {done
                            ? 'Done'
                            : days < 0
                              ? `${Math.abs(days)} days overdue`
                              : days === 0
                                ? 'Due today'
                                : `${days} days left`}
                        </span>
                        <span className="text-[11px] text-[var(--chat-muted-2)]">{deadline.due_date}</span>
                        {deadline.source_law_title && (
                          <span className="truncate text-[11px] text-[var(--chat-muted-2)]">
                            {deadline.source_law_title}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void remove(deadline)}
                      aria-label="Delete deadline"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted-2)] transition-colors hover:bg-[var(--chat-chip)] hover:text-red-500"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pulls "within N days" style time limits out of an answer so they can be saved. */
export function extractDeadlineSuggestions(text: string): { label: string; days: number }[] {
  const suggestions: { label: string; days: number }[] = [];
  const seen = new Set<number>();

  const patterns = [
    /within\s+(\d{1,3})\s+(calendar\s+)?days?/gi,
    /(\d{1,3})\s+days?\s+(?:to|from)\b/gi,
    /(\d{1,3})\s+months?\s+(?:to|from)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const amount = Number(match[1]);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 365) continue;
      const days = match[0].includes('month') ? amount * 30 : amount;
      if (seen.has(days)) continue;
      seen.add(days);
      suggestions.push({ label: `Act within ${amount} ${match[0].includes('month') ? 'month' : 'day'}${amount === 1 ? '' : 's'}`, days });
    }
  }

  return suggestions.slice(0, 3);
}

/** ISO date N days from today, used when a suggestion is accepted. */
export function isoDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}