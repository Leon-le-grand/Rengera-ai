import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  Square,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import { isApiError } from '@/api/client';
import { describeApiError } from '@/api/errors';
import type { FriendlyError } from '@/api/errors';
import { requestAnswer } from '@/api/answers';
import type { AnswerResponse } from '@/api/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LanguageSelect } from '@/components/ui/LanguageSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { ErrorState } from '@/components/ui/States';
import type { AnswerLanguage } from '@/i18n/languages';

import { AnswerPanel } from './AnswerPanel';
import { containsUrgentLanguage } from './urgent-language';

interface ChatEntry {
  id: string;
  question: string;
  language: AnswerLanguage;
  status: 'pending' | 'done' | 'error';
  response?: AnswerResponse;
  error?: FriendlyError;
}

interface PendingUrgentQuestion {
  question: string;
  language: AnswerLanguage;
}

export function ChatPage({ initialQuestion = '' }: { initialQuestion?: string }) {
  const { language, setLanguage } = useLanguage();
  const [draft, setDraft] = useState(initialQuestion);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [urgent, setUrgent] = useState<PendingUrgentQuestion | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const nextId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const focusComposer = () => {
    textareaRef.current?.focus();
  };

  const runQuestion = async (
    question: string,
    requestLanguage: AnswerLanguage,
    entryId: string,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: 'pending', error: undefined, response: undefined }
          : entry,
      ),
    );

    try {
      const response = await requestAnswer(
        { question, language: requestLanguage },
        controller.signal,
      );
      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId ? { ...entry, status: 'done', response } : entry,
        ),
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'aborted') {
        setEntries((current) =>
          current.map((entry) =>
            entry.id === entryId ? { ...entry, status: 'error', error: undefined } : entry,
          ),
        );
        return;
      }
      const friendly = describeApiError(error, 'answer');
      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId ? { ...entry, status: 'error', error: friendly } : entry,
        ),
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const submit = (question: string, requestLanguage: AnswerLanguage) => {
    const trimmed = question.trim();
    if (trimmed.length < 5) {
      setValidation('Add a little more detail before sending your question.');
      focusComposer();
      return;
    }

    setValidation(null);
    const id = `q${nextId.current++}`;
    const entry: ChatEntry = {
      id,
      question: trimmed,
      language: requestLanguage,
      status: 'pending',
    };
    setEntries((current) => [...current, entry]);
    setDraft('');
    setUrgent(null);
    window.setTimeout(() => {
      latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    void runQuestion(trimmed, requestLanguage, id);
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question) {
      setValidation('Write a question before sending.');
      focusComposer();
      return;
    }
    if (containsUrgentLanguage(question)) {
      setValidation(null);
      setUrgent({ question, language });
      return;
    }
    submit(question, language);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const cancelPending = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const retryEntry = (entry: ChatEntry) => {
    void runQuestion(entry.question, entry.language, entry.id);
  };

  const anyPending = entries.some((entry) => entry.status === 'pending');

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow="Assistant"
        title="Ask about a Rwandan law"
        description="Describe the situation in your own words. Rengera searches available sources and shows the evidence it used. It will not invent an answer when the sources are missing."
        actions={<LanguageSelect value={language} onChange={setLanguage} compact />}
      />

      <div className="mt-5 border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] px-4 py-3 text-xs leading-5 text-[var(--app-warning-text)]">
        <p className="font-bold">Legal information, not legal advice.</p>
        <p className="mt-0.5">
          Coverage is limited to laws available from the API. Verify important
          matters against the source and a qualified professional.
        </p>
      </div>

      {entries.length === 0 ? (
        <section aria-labelledby="chat-start" className="mt-6 grid gap-4 sm:grid-cols-3">
          <h2 id="chat-start" className="sr-only">
            How to ask a useful question
          </h2>
          {[
            {
              icon: MessageSquare,
              title: 'Describe what happened',
              body: 'Include the type of problem, who was involved and what outcome you need to understand.',
            },
            {
              icon: BookOpen,
              title: 'Name the law if you know it',
              body: 'A law title or article number can narrow the search, but it is not required.',
            },
            {
              icon: ShieldAlert,
              title: 'Immediate danger? Call 112',
              body: 'The assistant is not an emergency service. The urgent-help page works without an account.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="surface p-4 text-sm leading-6 text-[var(--app-muted)]"
              >
                <Icon
                  size={17}
                  aria-hidden="true"
                  className={
                    item.icon === ShieldAlert
                      ? 'text-[var(--app-danger-text)]'
                      : 'text-[var(--app-accent)]'
                  }
                />
                <p className="mt-2 font-bold text-[var(--app-text)]">{item.title}</p>
                <p className="mt-1 text-xs">{item.body}</p>
              </div>
            );
          })}
        </section>
      ) : null}

      <div className="mt-8 space-y-8" aria-live="polite">
        {entries.map((entry) => (
          <article key={entry.id} className="scroll-mt-24">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] text-[var(--app-muted)]">
                <UserRound size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
                    Your question
                  </p>
                  <span className="chip uppercase">{entry.language}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--app-text)]">
                  {entry.question}
                </p>
              </div>
            </div>

            <div className="mt-4 sm:pl-12">
              {entry.status === 'pending' ? (
                <div className="surface p-5" role="status">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--app-border-strong)] border-t-[var(--app-accent)]" />
                    <div>
                      <p className="text-sm font-bold text-[var(--app-text)]">
                        Searching available sources…
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        Nothing is shown until the service returns a usable result.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cancelPending}
                    className="btn btn-ghost mt-3 min-h-9 px-2.5 py-1.5 text-xs"
                  >
                    <Square size={12} aria-hidden="true" />
                    Stop this request
                  </button>
                </div>
              ) : null}

              {entry.status === 'error' && entry.error ? (
                <ErrorState
                  title={entry.error.title}
                  message={entry.error.message}
                  requestId={entry.error.requestId}
                  onRetry={
                    entry.error.canRetry ? () => retryEntry(entry) : undefined
                  }
                  retryLabel="Ask again"
                />
              ) : null}

              {entry.status === 'error' && !entry.error ? (
                <InlineNotice tone="neutral" role="status">
                  The request was stopped. Nothing was saved or answered.
                  <button
                    type="button"
                    onClick={() => retryEntry(entry)}
                    className="ml-2 font-bold text-[var(--app-accent)] underline underline-offset-4"
                  >
                    Ask again
                  </button>
                </InlineNotice>
              ) : null}

              {entry.status === 'done' && entry.response ? (
                <AnswerPanel
                  response={entry.response}
                  onRetry={() => retryEntry(entry)}
                />
              ) : null}
            </div>
          </article>
        ))}
        <div ref={latestRef} />
      </div>

      <div className="mt-10 border-t border-[var(--app-border)] pt-6">
        <form onSubmit={handleSubmit} className="surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="chat-question"
              className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]"
            >
              Your question
            </label>
            <span className="text-[10px] text-[var(--app-faint)]">
              {draft.length}/2000
            </span>
          </div>
          <textarea
            id="chat-question"
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value.slice(0, 2000));
              if (validation) setValidation(null);
            }}
            onKeyDown={handleComposerKeyDown}
            rows={4}
            disabled={anyPending}
            aria-invalid={Boolean(validation) || undefined}
            aria-describedby={validation ? 'chat-validation' : 'chat-hint'}
            className="field mt-2 resize-y"
            placeholder="Example: I was dismissed from work without notice. What does the available law say about notice?"
          />

          {validation ? (
            <p
              id="chat-validation"
              role="alert"
              className="mt-2 text-xs font-semibold text-[var(--app-danger-text)]"
            >
              {validation}
            </p>
          ) : (
            <p id="chat-hint" className="mt-2 text-xs text-[var(--app-faint)]">
              Ctrl/⌘ + Enter sends. Do not include names, ID numbers or other
              sensitive details unless necessary.
            </p>
          )}

          {urgent ? (
            <div className="mt-4 border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-danger-text)]">
                <ShieldAlert size={16} aria-hidden="true" />
                Your question may describe immediate danger.
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[var(--app-text-2)]">
                This check runs before the question is sent. If anyone is at risk,
                contact emergency services now instead of waiting for an online
                answer.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="tel:112" className="btn btn-danger min-h-10 px-3 py-2 text-xs">
                  <Phone size={14} aria-hidden="true" />
                  Call 112
                </a>
                <Link
                  to="/emergency"
                  className="btn btn-secondary min-h-10 px-3 py-2 text-xs"
                >
                  Emergency contacts
                </Link>
                <button
                  type="button"
                  onClick={() => submit(urgent.question, urgent.language)}
                  className="btn btn-ghost min-h-10 px-3 py-2 text-xs"
                >
                  Continue with my question anyway
                </button>
                <button
                  type="button"
                  onClick={() => setUrgent(null)}
                  className="btn btn-ghost min-h-10 px-3 py-2 text-xs"
                >
                  Edit question
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] text-[var(--app-faint)]">
              <CornerDownLeft size={12} aria-hidden="true" />
              Answers show sources or say they could not find one.
            </p>
            <div className="flex items-center gap-2">
              {anyPending ? (
                <button
                  type="button"
                  onClick={cancelPending}
                  className="btn btn-ghost min-h-10 px-3 py-2 text-xs"
                >
                  <Square size={12} aria-hidden="true" />
                  Stop
                </button>
              ) : null}
              <button
                type="submit"
                disabled={anyPending || !draft.trim()}
                className="btn btn-primary"
              >
                <Send size={15} aria-hidden="true" />
                Ask Rengera
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs leading-5 text-[var(--app-faint)]">
          <p>
            Questions are sent to the configured API only when you submit them.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/library"
              className="inline-flex min-h-9 items-center gap-1 font-bold text-[var(--app-accent)]"
            >
              Search sources instead
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} aria-hidden="true" />
              Not an emergency service
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
