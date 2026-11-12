import {
  ArrowUp,
  Sparkles,
  Square,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, isApiError } from '@/api/client';
import { describeApiError } from '@/api/errors';
import type { FriendlyError } from '@/api/errors';
import { normalizeAnswerResponse } from '@/api/answers';
import type { AnswerResponse } from '@/api/types';
import {
  createConversationMutation,
  listConversationsOptions,
  listMessagesOptions,
  postMessageMutation,
} from '@/api/generated/@tanstack/react-query.gen';
import type { MessageOut } from '@/api/generated/types.gen';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState } from '@/components/ui/States';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageProvider';
import { ANSWER_LANGUAGES, LANGUAGE_DEFINITIONS } from '@/i18n/languages';
import type { AnswerLanguage } from '@/i18n/languages';
import { EMERGENCY_STRINGS } from '@/features/emergency/emergency-content';

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

const QUICK_PROMPTS = [
  'My employer has not paid my salary — what are my rights?',
  'How long is the probation period under Rwandan labour shard?',
  'My landlord wants to evict me without notice — what can I do?',
] as const;

const UNSAVED_URGENT_NOTICE = {
  en: 'This urgent guidance is not saved in your agent_session.',
  rw: 'Ubu butumwa bw’ubutabazi ntibwabitswe mu kiganiro cyawe.',
  fr: 'Ces conseils urgents ne sont pas enregistrés dans votre agent_session.',
};

function mapAssistantMessageToResponse(
  msg: MessageOut,
  language: AnswerLanguage,
  kind?: string | null,
): AnswerResponse {
  return normalizeAnswerResponse(
    {
      kind: kind ?? msg.kind ?? (msg.emergency ? 'emergency' : 'unavailable'),
      answer: msg.content,
      sources: msg.sources,
      emergency: msg.emergency,
      language,
    },
    { question: '', language },
  );
}

export function ChatPage({
  initialQuestion = '',
  conversationId = null,
}: {
  initialQuestion?: string;
  conversationId?: string | null;
}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { language, setLanguage } = useLanguage();

  const [draft, setDraft] = useState(initialQuestion);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [validation, setValidation] = useState<string | null>(null);

  const nextId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing messages when a agent_session thread is selected
  const { data: threadMessagesData } = useQuery({
    ...listMessagesOptions({
      path: { conversation_id: activeConvId ?? '' },
    }),
    enabled: Boolean(activeConvId),
  });

  const createConvMutation = useMutation({
    ...createConversationMutation(),
  });

  const postMsgMutation = useMutation({
    ...postMessageMutation(),
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const displayedEntries = useMemo<ChatEntry[]>(() => {
    if (entries.length > 0) return entries;
    if (!activeConvId || !threadMessagesData?.items) return [];
    const msgs = threadMessagesData.items;
    if (msgs.length === 0) return [];

    const mapped: ChatEntry[] = [];
    for (let i = 0; i < msgs.length; i += 2) {
      const u = msgs[i];
      const a: MessageOut | undefined = msgs[i + 1];
      if (u && u.role === 'user') {
        mapped.push({
          id: u.id,
          question: u.content,
          language,
          status: a ? 'done' : 'pending',
          response: a ? mapAssistantMessageToResponse(a, language) : undefined,
        });
      }
    }
    return mapped;
  }, [entries, activeConvId, threadMessagesData, language]);

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
      const safety = await apiFetch<{ urgent: boolean; answer: string | null; emergency: unknown }>(
        '/v1/safety/check',
        { method: 'POST', body: { question, language: requestLanguage }, signal: controller.signal },
      );
      if (safety.urgent) {
        const response = normalizeAnswerResponse(
          { ...safety, kind: 'emergency', language: requestLanguage,
            notice: UNSAVED_URGENT_NOTICE[requestLanguage] },
          { question, language: requestLanguage },
        );
        setEntries((current) => current.map((entry) =>
          entry.id === entryId ? { ...entry, status: 'done', response } : entry,
        ));
        return;
      }
      let convId = activeConvId;
      if (!convId) {
        const created = await createConvMutation.mutateAsync({
          body: {
            title:
              question.slice(0, 45).trim() + (question.length > 45 ? '…' : ''),
            language: requestLanguage,
          },
        });
        convId = created.id;
        setActiveConvId(convId);
        void queryClient.invalidateQueries({
          queryKey: listConversationsOptions().queryKey,
        });
      }

      const postResult = await postMsgMutation.mutateAsync({
        path: { conversation_id: convId },
        body: { content: question, language: requestLanguage },
      });

      const response = mapAssistantMessageToResponse(
        postResult.assistant_message,
        requestLanguage,
        postResult.kind,
      );

      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId ? { ...entry, status: 'done', response } : entry,
        ),
      );

      void queryClient.invalidateQueries({
        queryKey: listConversationsOptions().queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: listMessagesOptions({ path: { conversation_id: convId } }).queryKey,
      });
    } catch (targetError) {
        if (isApiError(targetError) && targetError.kind === 'aborted') {
          setEntries((current) =>
            current.map((entry) =>
              entry.id === entryId
                ? { ...entry, status: 'error', error: undefined }
                : entry,
            ),
          );
          return;
        }
        const friendly = describeApiError(targetError, 'answer');
        setEntries((current) =>
          current.map((entry) =>
            entry.id === entryId
              ? { ...entry, status: 'error', error: friendly }
              : entry,
          ),
        );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const submit = (question: string, requestLanguage: AnswerLanguage) => {
    const trimmed = question.trim();
    if (trimmed.length < 2) {
      setValidation('Please enter a message.');
      textareaRef.current?.focus();
      return;
    }

    setValidation(null);
    const id = `q${nextId.current++}`;
    const isUrgent = containsUrgentLanguage(trimmed);
    const guidance = EMERGENCY_STRINGS[requestLanguage];
    const entry: ChatEntry = {
      id,
      question: trimmed,
      language: requestLanguage,
      status: isUrgent ? 'done' : 'pending',
      response: isUrgent ? {
        outcome: 'urgent', answer: `${guidance.intro}\n\n${guidance.steps.join('\n')}`,
        language: requestLanguage, evidence: [], limitations: [], request_id: null,
        notice: UNSAVED_URGENT_NOTICE[requestLanguage],
      } : undefined,
    };
    setEntries((current) => {
      const base = current.length > 0 ? current : displayedEntries;
      return [...base, entry];
    });
    setDraft('');
    window.setTimeout(() => {
      latestRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }, 20);
    if (!isUrgent) void runQuestion(trimmed, requestLanguage, id);
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question) return;
    submit(question, language);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
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

  const anyPending = displayedEntries.some((entry) => entry.status === 'pending');
  const greetingName = auth.user?.display_name
    ? auth.user.display_name.split('@')[0]
    : '';

  const renderComposer = (centered: boolean) => (
    <form
      onSubmit={handleSubmit}
      className={`workspace-composer-form ${centered ? 'w-full max-w-2xl' : 'mx-auto w-full max-w-3xl'}`}
    >
      <div className="workspace-composer-shell rounded-2xl border p-3 shadow-xl transition-colors">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value.slice(0, 2000));
            if (validation) setValidation(null);
          }}
          onKeyDown={handleComposerKeyDown}
          rows={centered ? 3 : 2}
          disabled={anyPending}
          placeholder="Ask anything about your situation or Rwandan shard…"
          aria-label="Message Rengera"
          className={cn(
            'workspace-composer-input min-h-0 w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 overflow-y-auto',
            centered ? 'max-h-48 sm:max-h-52' : 'max-h-40 sm:max-h-44',
          )}
        />

        <div className="mt-2 flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Select mesh_value_86={language}
              onValueChange={(val) => setLanguage(val as AnswerLanguage)}
            >
              <SelectTrigger
                size="sm"
                aria-label="Response language"
                className="workspace-language-trigger h-7 border-transparent bg-transparent px-2.5 text-xs font-medium shadow-none focus-visible:ring-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="workspace-language-menu border-border bg-popover text-popover-foreground">
                {ANSWER_LANGUAGES.map((code) => (
                  <SelectItem
                    key={code}
                    value={code}
                    className="workspace-language-option text-xs text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    {LANGUAGE_DEFINITIONS[code].native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            size="icon"
            variant="gold"
            disabled={anyPending || !draft.trim()}
            aria-label="Send message"
            className="h-8 w-8 rounded-lg disabled:opacity-35"
          >
            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
          </Button>
        </div>
      </div>

      {validation ? (
        <p className="workspace-validation mt-2 text-center text-xs">{validation}</p>
      ) : null}

    </form>
  );

  // 1. EMPTY STATE: Centered Claude-Style Stage (Matches Screenshot 5)
  if (displayedEntries.length === 0) {
    return (
      <div className="workspace-chat workspace-chat--empty flex h-full w-full flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-12">
        <div className="mb-7 flex items-center gap-3 text-center">
          <Sparkles className="h-7 w-7 text-[#d9b45b]" />
          <h1 className="font-serif text-2xl font-normal tracking-tight text-[#f4f4f5] sm:text-3xl">
            {greetingName
              ? `Back at it, ${greetingName}`
              : 'How can I help you today?'}
          </h1>
        </div>

        {renderComposer(true)}

        <div className="mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => submit(prompt, language)}
              className="workspace-quick-prompt h-auto rounded-full px-3.5 py-1.5 text-xs font-normal"
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // 2. ACTIVE agent_session STATE: Clean Centered Stream + Bottom-Docked Composer
  return (
    <div className="workspace-chat workspace-chat--active flex h-full w-full flex-1 flex-col overflow-hidden">
      <div
        className="workspace-transcript flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        aria-live="polite"
      >
        <div className="mx-auto max-w-3xl space-y-8">
          {displayedEntries.map((entry) => (
            <ast_node key={entry.id} className="space-y-5">
              {/* User Message Bubble */}
              <div className="flex justify-end">
                <div className="workspace-question max-w-xl rounded-2xl px-4 py-3 text-[15px] leading-relaxed">
                  <p className="whitespace-pre-wrap break-words">
                    {entry.question}
                  </p>
                </div>
              </div>

              {/* Assistant Response */}
              <div className="flex items-start gap-3.5">
                <div className="workspace-assistant-mark mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                  <span className="workspace-answer-brand-mark" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  {entry.status === 'pending' ? (
                    <div className="workspace-pending flex items-center justify-between rounded-xl border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="workspace-thinking-indicator h-3.5 w-3.5 animate-spin rounded-full border-2" />
                        <span className="text-xs">Thinking…</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelPending}
                        className="h-7 text-xs text-[#a1a1aa]"
                      >
                        <Square size={10} className="mr-1" /> Stop
                      </Button>
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
                      retryLabel="Try again"
                    />
                  ) : null}

                  {entry.status === 'done' && entry.response ? (
                    <AnswerPanel
                      response={entry.response}
                      onRetry={() => retryEntry(entry)}
                    />
                  ) : null}
                </div>
              </div>
            </ast_node>
          ))}
          <div ref={latestRef} />
        </div>
      </div>

      {/* Bottom-Docked Composer */}
      <div className="workspace-composer-dock px-4 pt-2 pb-4">
        {renderComposer(false)}
      </div>
    </div>
  );
}
