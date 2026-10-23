'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import {
  ANSWER_LANGUAGES,
  LANGUAGE_DEFINITIONS,
  type AnswerLanguage,
} from '@/lib/answer-language';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'rengera_language_v1';

/** Reads the saved answer language on the client, defaulting to English. */
export function useStoredLanguage(): [AnswerLanguage, (next: AnswerLanguage) => void] {
  const [language, setLanguage] = useState<AnswerLanguage>('en');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && (ANSWER_LANGUAGES as readonly string[]).includes(stored)) {
        setLanguage(stored as AnswerLanguage);
      }
    } catch {
      // Private browsing: fall back to English.
    }
  }, []);

  const update = (next: AnswerLanguage) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal.
    }
  };

  return [language, update];
}

export default function LanguageMenu({
  value,
  onChange,
  className,
}: {
  value: AnswerLanguage;
  onChange: (next: AnswerLanguage) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--chat-border)] px-3 py-[7px] text-[12px] font-medium text-[var(--chat-text)] outline-none transition-colors hover:bg-[var(--chat-hover)]"
      >
        <Globe size={13} strokeWidth={2} className="text-[var(--chat-muted)]" />
        {LANGUAGE_DEFINITIONS[value].native}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-44 overflow-hidden rounded-[14px] border border-[var(--chat-border-soft)] bg-white py-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
        >
          {ANSWER_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={code === value}
              onClick={() => {
                onChange(code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] text-[var(--chat-text-2)] outline-none transition-colors hover:bg-[var(--chat-chip)]"
            >
              <span className="flex flex-col">
                <span className="font-medium">{LANGUAGE_DEFINITIONS[code].native}</span>
                <span className="text-[10px] text-[var(--chat-muted-2)]">{LANGUAGE_DEFINITIONS[code].label}</span>
              </span>
              {code === value && <Check size={13} strokeWidth={3} className="text-[#1a73e8]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}