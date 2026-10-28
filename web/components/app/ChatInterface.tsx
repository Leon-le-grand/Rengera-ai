'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlarmClock,
  BookOpen,
  Car,
  Check,
  History,
  Download,
  FileText,
  Home,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import type { ElementType } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateLegalAdvice, type ArticleContext, type LegalSource } from '@/app/actions';
import { shareConsultation } from '@/app/share-actions';
import {
  createDeadline,
  logUsageEvent,
} from '@/app/product-actions';
import { detectEmergencyRisk } from '@/lib/safety';
import { UI_STRINGS, type AnswerLanguage } from '@/lib/answer-language';
import AnswerFeedback from '@/components/chat/AnswerFeedback';
import DeadlinesPanel, {
  extractDeadlineSuggestions,
  isoDateInDays,
} from '@/components/chat/DeadlinesPanel';
import LanguageMenu, { useStoredLanguage } from '@/components/chat/LanguageMenu';
import LawChangeBanner from '@/components/chat/LawChangeBanner';
import {
  AssistantBlock,
  ChatDisclaimer,
  ChatFrame,
  ChatTopBar,
  ComposerActions,
  ComposerChip,
  ComposerFrame,
  GeneratingRow,
  ScrollDownButton,
  SourceList,
  UserBubble,
  ViewedRow,
} from '@/components/chat/ChatSurface';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: LegalSource[];
  /** Only 'answer' gets Share / Save PDF / feedback. Set by the server. */
  kind?: 'greeting' | 'help' | 'fallback' | 'emergency' | 'answer' | 'connection-error';
}

/** A question handed over from the Law Library: "explain this article to me". */
export interface PendingArticleAsk {
  prompt: string;
  context: ArticleContext;
}

interface ChatInterfaceProps {
  /** Opens one article of one law inside the Law Library reader. */
  onOpenLaw?: (lawId: string, articleNumber?: string | null) => void;
  /** Opens the public law library without selecting a particular article. */
  onOpenLibrary?: () => void;
  /** Opens official emergency and contact information. */
  onOpenEmergency?: () => void;
  /** Set when the user asks a follow-up from inside a law. */
  pendingAsk?: PendingArticleAsk | null;
  onPendingAskHandled?: () => void;
  /** Namespaces local chat storage per signed-in account. Defaults to public. */
  accountKey?: string;
}

const SESSION_STORAGE_BASE = 'rengera_ai_chat_session_v1';
const HISTORY_STORAGE_BASE = 'rengera_ai_chat_history_v1';

function storageKey(base: string, accountKey: string): string {
  const safe = (accountKey || 'public').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'public';
  return `${base}__${safe}`;
}

interface StoredChat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

function chatTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  const raw = (firstUser?.content || 'New consultation').replace(/\s+/g, ' ').trim();
  return raw.length > 42 ? `${raw.slice(0, 42)}…` : raw;
}

function loadStoredHistory(accountKey: string): StoredChat[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(storageKey(HISTORY_STORAGE_BASE, accountKey));
    const parsed = JSON.parse(stored || '[]') as StoredChat[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

const SCENARIOS: { id: 'tenant' | 'employment' | 'privacy' | 'traffic'; icon: ElementType }[] = [
  { id: 'tenant', icon: Home },
  { id: 'employment', icon: FileText },
  { id: 'privacy', icon: Shield },
  { id: 'traffic', icon: Car },
];

function labelsFor(language: AnswerLanguage) {
  return UI_STRINGS[language].scenarios;
}

function formatLawStatus(status: string | null, language: AnswerLanguage): string {
  const strings = UI_STRINGS[language];
  switch (status?.toLowerCase()) {
    case 'active':
      return strings.statusActive;
    case 'amended':
      return strings.statusAmended;
    case 'repealed':
      return strings.statusRepealed;
    default:
      return status?.trim() || strings.statusUnknown;
  }
}

function safeSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function greetingFor(language: AnswerLanguage): Message {
  return { id: 'msg-0', role: 'assistant', content: UI_STRINGS[language].greeting };
}

function loadStoredMessages(accountKey: string): Message[] {
  if (typeof window === 'undefined') return [greetingFor('en')];

  try {
    const stored = window.localStorage.getItem(storageKey(SESSION_STORAGE_BASE, accountKey));
    if (!stored) return [greetingFor('en')];
    const parsed = JSON.parse(stored) as { messages?: Message[] };
    return Array.isArray(parsed.messages) && parsed.messages.length > 0
      ? parsed.messages
      : [greetingFor('en')];
  } catch {
    return [greetingFor('en')];
  }
}

export default function ChatInterface({
  onOpenLaw,
  onOpenLibrary,
  onOpenEmergency,
  pendingAsk = null,
  onPendingAskHandled,
  accountKey = 'public',
}: ChatInterfaceProps = {}) {
  const [language, setLanguage] = useStoredLanguage();
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages(accountKey));
  const [input, setInput] = useState('');
  const [articleContext, setArticleContext] = useState<ArticleContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [printStatus, setPrintStatus] = useState('');
  const [sharingMessageId, setSharingMessageId] = useState<string | null>(null);
  const [sharedMessageId, setSharedMessageId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState('');
  const [showShareNotice, setShowShareNotice] = useState(false);
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StoredChat[]>(() => loadStoredHistory(accountKey));
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>('');
  const emergencyRisk = detectEmergencyRisk(input);
  const strings = UI_STRINGS[language];
  const scenarios = useMemo(() => labelsFor(language), [language]);

  if (!sessionId.current && typeof window !== 'undefined') {
    sessionId.current = window.localStorage.getItem('rengera_session_id') || crypto.randomUUID();
    window.localStorage.setItem('rengera_session_id', sessionId.current);
  }

  useEffect(() => {
    window.localStorage.setItem(
      storageKey(SESSION_STORAGE_BASE, accountKey),
      JSON.stringify({ messages, updatedAt: new Date().toISOString() }),
    );
  }, [messages, accountKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey(HISTORY_STORAGE_BASE, accountKey),
        JSON.stringify(history.slice(0, 20)),
      );
    } catch {
      // Non-fatal: history stays in memory.
    }
  }, [history, accountKey]);

  // Switching accounts must never show the previous account's chats.
  useEffect(() => {
    setMessages(loadStoredMessages(accountKey));
    setHistory(loadStoredHistory(accountKey));
    setInput('');
    setArticleContext(null);
    setShowHistory(false);
    setShowShareNotice(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountKey]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // A follow-up launched from the Law Library arrives with its article attached.
  useEffect(() => {
    if (!pendingAsk) return;
    setArticleContext(pendingAsk.context);
    setInput(pendingAsk.prompt);
    onPendingAskHandled?.();
  }, [pendingAsk, onPendingAskHandled]);

  // Translating an untouched welcome screen is free; translating a live thread
  // is not attempted because the answer would no longer match the question.
  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0].id === 'msg-0'
        ? [greetingFor(language)]
        : current,
    );
  }, [language]);

  const handleSubmit = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    const query = (presetPrompt || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: query };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    void logUsageEvent({
      eventType: 'question_asked',
      language,
      surface: 'chat',
      query,
      sessionId: sessionId.current,
      userId: accountKey,
    });

    try {
      const history = messages
        .filter((message) => message.id !== 'msg-0')
        .map((message) => ({
          role: message.role === 'user' ? 'user' : 'model',
          content: message.content,
        })) as { role: 'user' | 'model'; content: string }[];

      const answer = await generateLegalAdvice(query, history, { language, articleContext });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer.reply || "I couldn't generate a response. Please try again.",
        sources: answer.sources || [],
        kind: answer.kind || 'answer',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      void logUsageEvent({
        eventType: 'answer_given',
        language,
        surface: 'chat',
        query,
        sessionId: sessionId.current,
        userId: accountKey,
        lawReferences: (answer.sources || []).map(
          (source) => `${source.referenceNumber || source.title}${source.articleNumber ? ` Art. ${source.articleNumber}` : ''}`,
        ),
      });
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: strings.connectionError,
          kind: 'connection-error',
        },
      ]);
    } finally {
      setArticleContext(null);
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // Archive the thread before clearing, so the dropdown can restore it.
    if (messages.some((m) => m.role === 'user')) {
      const entry: StoredChat = {
        id: crypto.randomUUID(),
        title: chatTitle(messages),
        messages,
        updatedAt: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 20));
    }
    setMessages([greetingFor(language)]);
    setInput('');
    setArticleContext(null);
    setShowShareNotice(false);
    setShowHistory(false);
    streamRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restoreChat = (chat: StoredChat) => {
    if (messages.some((m) => m.role === 'user')) {
      const entry: StoredChat = {
        id: crypto.randomUUID(),
        title: chatTitle(messages),
        messages,
        updatedAt: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 20));
    }
    setMessages(chat.messages);
    setShowHistory(false);
    setInput('');
    setArticleContext(null);
  };

  const deleteChat = (id: string) => {
    setHistory((prev) => prev.filter((c) => c.id !== id));
  };

  const handleShare = async (message: Message) => {
    if (sharingMessageId) return;
    // Greetings, help texts and fallbacks carry no citation — never shareable.
    if (!message.sources || message.sources.length === 0) {
      setShareNotice('Only answers with official citations can be shared.');
      setShowShareNotice(true);
      return;
    }

    const index = messages.findIndex((item) => item.id === message.id);
    if (index <= 0) return;

    setSharingMessageId(message.id);
    setShareNotice('');

    try {
      const result = await shareConsultation(
        messages[index - 1].content,
        message.content,
        (message.sources || []).map((source) => ({
          lawId: source.lawId,
          title: source.title,
          referenceNumber: source.referenceNumber,
          articleNumber: source.articleNumber,
        })),
      );

      if (!result.success) {
        setShareNotice(result.error || 'The link could not be created.');
        return;
      }

      setSharedMessageId(message.id);
      void logUsageEvent({ eventType: 'share_created', language, surface: 'chat', sessionId: sessionId.current, userId: accountKey });

      try {
        await navigator.clipboard.writeText(result.shareUrl || '');
        setShareNotice('Link copied to your clipboard.');
      } catch {
        setShareNotice(`Share link: ${result.shareUrl}`);
      }
    } catch (error) {
      setShareNotice(error instanceof Error ? error.message : 'The link could not be created.');
    } finally {
      setSharingMessageId(null);
    }
  };

  const handleSaveAsPdf = () => {
    setPrintStatus('Opening the print dialog… choose “Save as PDF”.');
    window.setTimeout(() => {
      window.print();
      setPrintStatus('');
    }, 50);
  };

  const hasConversation = messages.some((message) => message.role === 'user');

  const openLaw = (lawId: string, articleNumber?: string | null) => {
    onOpenLaw?.(lawId, articleNumber);
    void logUsageEvent({ eventType: 'law_opened', language, surface: 'chat', sessionId: sessionId.current, userId: accountKey });
  };

  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      components={{
        h3: ({ node, ...props }) => (
          <h3 className="mt-4 mb-1.5 text-[15px] font-bold tracking-[-0.01em] text-[var(--chat-text)] first:mt-0" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="mt-3 mb-1 text-sm font-bold text-[var(--chat-text)]" {...props} />
        ),
        p: ({ node, ...props }) => <p className="mb-2.5 mt-0 text-sm font-medium leading-[1.65]" {...props} />,
        ul: ({ node, ...props }) => <ul className="my-2 space-y-1.5 pl-0" {...props} />,
        ol: ({ node, ...props }) => <ol className="my-2 list-decimal space-y-1.5 pl-5" {...props} />,
        li: ({ node, ...props }) => (
          <li className="flex gap-2 text-sm font-medium leading-[1.65]">
            <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--chat-muted)]" />
            <span className="min-w-0">{props.children}</span>
          </li>
        ),
        a: ({ node, ...props }) => (
          <a className="text-[var(--chat-accent)] underline underline-offset-4" target="_blank" rel="noreferrer noopener" {...props} />
        ),
        strong: ({ node, ...props }) => <strong className="font-semibold text-[var(--chat-text)]" {...props} />,
        blockquote: ({ node, ...props }) => (
          <blockquote className="my-2 border-l-2 border-[var(--chat-border-soft)] pl-3 text-[var(--chat-muted)]" {...props} />
        ),
        code: ({ node, ...props }) => (
          <code className="rounded-[4px] bg-[var(--chat-chip)] px-1 py-[1px] font-mono text-[12px] text-[var(--chat-text-2)]" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="chat-workspace relative flex h-full min-h-0 w-full justify-center p-0 sm:p-3 xl:p-4">
      <ChatFrame className="chat-print-area relative h-full max-w-[1360px]">
        <LawChangeBanner />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative z-20 shrink-0">
            <ChatTopBar
              title={hasConversation ? strings.consultationTitle : strings.workspaceTitle}
            >
              <button
                type="button"
                onClick={handleNewChat}
                aria-label={strings.newQuestion}
                title={strings.newQuestion}
                className="inline-flex h-9 items-center justify-center gap-1.5 border border-[var(--chat-border)] px-2 text-[12px] font-medium text-[var(--chat-text-2)] transition-colors hover:bg-[var(--chat-hover)] sm:px-2.5"
              >
                <Plus size={15} strokeWidth={2} />
                <span className="hidden sm:inline">{strings.newQuestion}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-label={strings.previousChats}
                title={strings.previousChats}
                aria-expanded={showHistory}
                aria-controls="rengera-chat-history"
                className="inline-flex h-9 w-9 items-center justify-center border border-[var(--chat-border)] text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
              >
                <History size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={onOpenEmergency}
                aria-label={`${strings.urgentHelp} · 112`}
                title={`${strings.urgentHelp} · 112`}
                className="inline-flex h-9 items-center justify-center gap-1.5 border border-[var(--chat-danger-border)] px-2 text-[12px] font-semibold text-[var(--chat-danger-text)] transition-colors hover:bg-[var(--chat-danger-bg)] sm:px-2.5"
              >
                <ShieldAlert size={15} strokeWidth={2} />
                <span className="hidden sm:inline">{strings.urgentHelp}</span>
                <span className="tabular-nums">112</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeadlines(true)}
                aria-label={strings.openDeadlines}
                title={strings.openDeadlines}
                className="hidden h-9 w-9 items-center justify-center border border-[var(--chat-border)] text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)] sm:flex"
              >
                <AlarmClock size={15} strokeWidth={2} />
              </button>
            </ChatTopBar>

            {showHistory && (
              <>
                <button
                  type="button"
                  aria-label={strings.closeHistory}
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setShowHistory(false)}
                />
                <div
                  id="rengera-chat-history"
                  role="region"
                  aria-label={strings.previousChats}
                  className="absolute right-3 top-full z-40 mt-1 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden border border-[var(--chat-border)] bg-[var(--chat-panel)] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)] sm:right-5"
                >
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="flex w-full items-center gap-2 border-b border-[var(--chat-border)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--chat-text)] transition-colors hover:bg-[var(--chat-hover)]"
                  >
                    <Plus size={15} />
                    {strings.newQuestion}
                  </button>
                  <div className="max-h-64 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-[var(--chat-muted)]">
                        {strings.noPreviousChats}
                      </p>
                    ) : (
                      history.map((chat) => (
                        <div
                          key={chat.id}
                          className="group flex items-center gap-2 border-b border-[var(--chat-border)] px-4 py-2.5 last:border-0 hover:bg-[var(--chat-hover)]"
                        >
                          <button
                            type="button"
                            onClick={() => restoreChat(chat)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-[13px] font-medium text-[var(--chat-text)]">
                              {chat.title}
                            </p>
                            <p className="text-[11px] text-[var(--chat-muted-2)]">
                              {new Date(chat.updatedAt).toLocaleDateString(language)} ·{' '}
                              {(() => {
                                const count = chat.messages.filter((m) => m.role === 'user').length;
                                return `${count} ${count === 1 ? strings.questionSingular : strings.questionPlural}`;
                              })()}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChat(chat.id)}
                            aria-label={`${strings.deleteChat}: ${chat.title}`}
                            className="shrink-0 px-2 py-1 text-[11px] text-[var(--chat-muted)] transition-colors hover:text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col">
            <div
              ref={streamRef}
              role="log"
              aria-label={strings.conversation}
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={isLoading}
              className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
            >
              <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-4 pb-5 pt-6 sm:px-6 sm:pt-8">
                {messages.map((msg) => {
                  if (msg.role === 'assistant' && msg.id === 'msg-0' && hasConversation) {
                    return null;
                  }

                  if (msg.role === 'user') {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="mx-auto flex w-full max-w-[820px] flex-col gap-2"
                      >
                        <UserBubble>{msg.content}</UserBubble>
                      </motion.div>
                    );
                  }

                  const sources = msg.sources || [];
                  const isWelcome = msg.id === 'msg-0';
                  // Greetings, help, fallbacks and old threads without sources are
                  // plain text: no Share / Save PDF / feedback buttons.
                  const showAnswerTools =
                    !isWelcome &&
                    sources.length > 0 &&
                    (msg.kind === undefined || msg.kind === 'answer');
                  const question = messages[Math.max(0, messages.indexOf(msg) - 1)]?.content || '';
                  const deadlineHints = showAnswerTools ? extractDeadlineSuggestions(msg.content) : [];

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className={isWelcome ? 'w-full' : 'mx-auto flex w-full max-w-[820px] flex-col gap-3'}
                    >
                      {isWelcome && (
                        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_290px] xl:gap-14">
                          <section className="max-w-[720px] py-2" aria-labelledby="rengera-start-title">
                            <h2 id="rengera-start-title" className="max-w-[17ch] text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--chat-text)] sm:text-[42px]">
                              {strings.startTitle}
                            </h2>
                            <p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-[var(--chat-text-2)]">
                              {strings.startDescription}
                            </p>

                            <div className="mt-7">
                              <p className="mb-2 text-[12px] font-semibold text-[var(--chat-muted)]">{strings.trySample}</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {SCENARIOS.map((scenario) => (
                                  <button
                                    key={scenario.id}
                                    type="button"
                                    onClick={() => handleSubmit(undefined, strings.prompts[scenario.id])}
                                    className="flex min-h-11 items-center gap-3 border border-[var(--chat-border)] px-3 py-2.5 text-left text-[13px] font-medium leading-5 text-[var(--chat-text-2)] transition-colors hover:border-[var(--chat-accent)] hover:bg-[var(--chat-hover)]"
                                  >
                                    <scenario.icon size={16} strokeWidth={1.8} className="shrink-0 text-[var(--chat-accent)]" />
                                    <span>{scenarios[scenario.id]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={onOpenLibrary}
                              className="mt-5 inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[var(--chat-accent)] underline underline-offset-4"
                            >
                              <BookOpen size={15} strokeWidth={2} />
                              {strings.openLawLibrary}
                            </button>
                          </section>

                          <aside className="self-start border-t border-[var(--chat-border)] pt-5 xl:mt-2 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0" aria-labelledby="rengera-source-path-title">
                            <h3 id="rengera-source-path-title" className="text-[14px] font-semibold text-[var(--chat-text)]">
                              {strings.sourcePathTitle}
                            </h3>
                            <ol className="mt-5 space-y-4">
                              {[strings.sourcePathQuestion, strings.sourcePathLaw, strings.sourcePathArticle].map((step, index) => (
                                <li key={step} className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--chat-border)] text-[11px] font-semibold tabular-nums text-[var(--chat-accent)]">
                                    {index + 1}
                                  </span>
                                  <span className="pt-0.5 text-[13px] leading-5 text-[var(--chat-text-2)]">{step}</span>
                                </li>
                              ))}
                            </ol>
                            <p className="mt-5 border-t border-[var(--chat-border)] pt-4 text-[12px] leading-5 text-[var(--chat-muted)]">
                              {strings.sourcePathNote}
                            </p>
                          </aside>
                        </div>
                      )}

                      {!isWelcome && msg.kind === 'emergency' && (
                        <div role="alert" className="flex flex-col gap-3 border border-[var(--chat-danger-border)] bg-[var(--chat-danger-bg)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                          <div className="flex items-start gap-3">
                            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[var(--chat-danger-text)]" />
                            <div>
                              <h3 className="text-[13px] font-semibold text-[var(--chat-danger-text)]">{strings.urgentHelp}</h3>
                              <p className="mt-1 text-[12px] leading-5 text-[var(--chat-danger-text)] opacity-85">{strings.urgentGuidance}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={onOpenEmergency}
                            className="min-h-10 shrink-0 border border-[var(--chat-danger-border)] px-3 text-[12px] font-semibold text-[var(--chat-danger-text)] transition-colors hover:bg-[var(--chat-danger-bg)]"
                          >
                            {strings.openEmergencyContacts}
                          </button>
                        </div>
                      )}

                      {!isWelcome && msg.kind === 'connection-error' && (
                        <div role="alert" className="border border-[var(--chat-danger-border)] bg-[var(--chat-danger-bg)] p-4 text-[13px] leading-6 text-[var(--chat-danger-text)]">
                          {strings.connectionError}
                        </div>
                      )}

                      {!isWelcome && msg.kind === 'fallback' && sources.length === 0 && (
                        <section role="note" className="border border-[var(--chat-border)] bg-[var(--chat-user)] p-4">
                          <h3 className="text-[13px] font-semibold text-[var(--chat-text)]">{strings.noCitationTitle}</h3>
                          <p className="mt-1.5 max-w-[68ch] text-[13px] leading-6 text-[var(--chat-text-2)]">
                            {strings.noCitationDescription}
                          </p>
                          <button
                            type="button"
                            onClick={onOpenLibrary}
                            className="mt-3 min-h-10 border border-[var(--chat-border)] px-3 text-[12px] font-semibold text-[var(--chat-accent)] transition-colors hover:bg-[var(--chat-hover)]"
                          >
                            {strings.openLawLibrary}
                          </button>
                        </section>
                      )}

                      {!isWelcome && msg.kind !== 'connection-error' && (
                        <AssistantBlock>{renderMarkdown(msg.content)}</AssistantBlock>
                      )}

                      {!isWelcome && showAnswerTools && deadlineHints.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 border border-[var(--chat-border)] bg-[var(--chat-panel)] p-3">
                          <AlarmClock size={14} strokeWidth={2} className="text-[var(--chat-accent)]" />
                          <span className="text-[12px] text-[var(--chat-text-2)]">Time limit found — save it?</span>
                          {deadlineHints.map((hint) => (
                            <button
                              key={hint.label}
                              type="button"
                              onClick={async () => {
                                await createDeadline({
                                  label: hint.label,
                                  dueDate: isoDateInDays(hint.days),
                                  sourceLawTitle: sources[0]?.referenceNumber || sources[0]?.title || null,
                                  sourceArticle: sources[0]?.articleNumber || null,
                                });
                                setShowDeadlines(true);
                              }}
                              className="border border-[var(--chat-border)] bg-[var(--chat-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--chat-accent)] transition-colors hover:bg-[var(--chat-hover)]"
                            >
                              {hint.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isWelcome && sources.length > 0 && (
                        <>
                          <ViewedRow
                            label={showAnswerTools ? strings.sourcesUsed : strings.sourcesRetrieved}
                            source={
                              sources[0].articleNumber
                                ? `Art. ${sources[0].articleNumber}`
                                : sources[0].referenceNumber || sources[0].title
                            }
                          />
                          <SourceList
                            countLabel={`${strings.sourcesHeading} · ${sources.length}`}
                            openArticleLabel={strings.openArticle}
                            officialSourceLabel={strings.officialSource}
                            onSelect={(key) => {
                              const source = sources.find((item) => `${item.lawId}-${item.articleNumber ?? ''}` === key);
                              if (source) openLaw(source.lawId, source.articleNumber);
                            }}
                            items={sources.map((source, index) => ({
                              key: `${source.lawId}-${source.articleNumber ?? index}`,
                              title: source.title || source.referenceNumber || strings.openArticle,
                              subtitle: source.citation || `${source.referenceNumber || ''}${source.articleNumber ? ` · ${source.articleNumber}` : ''}`,
                              statusLabel: `${strings.lawStatusLabel}: ${formatLawStatus(source.status, language)}`,
                              reviewLabel: `${strings.classificationReviewLabel}: ${source.reviewed === true ? strings.classificationReviewed : source.reviewed === false ? strings.classificationPending : strings.classificationUnavailable}`,
                              sourceUrl: safeSourceUrl(source.sourceUrl),
                              active: index === 0,
                            }))}
                          />
                          {showAnswerTools && <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setArticleContext({
                                  lawTitle: sources[0].title,
                                  referenceNumber: sources[0].referenceNumber,
                                  articleNumber: sources[0].articleNumber,
                                });
                                setInput(strings.followUpPrompt);
                              }}
                              className="text-[12px] font-medium text-[var(--chat-accent)] outline-none underline underline-offset-4"
                            >
                              {strings.askArticleFollowUp}
                            </button>
                          </div>}
                        </>
                      )}

                      {!isWelcome && showAnswerTools && (
                        <>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowShareNotice(true);
                                handleShare(msg);
                              }}
                              className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3 py-[6px] text-[12px] font-medium text-[var(--chat-text-2)] outline-none transition-colors hover:bg-[var(--chat-hover)]"
                            >
                              {sharingMessageId === msg.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : sharedMessageId === msg.id ? (
                                <Check size={12} className="text-[var(--chat-accent)]" />
                              ) : (
                                <Link2 size={12} strokeWidth={2} />
                              )}
                              {sharingMessageId === msg.id
                                ? strings.creatingLink
                                : sharedMessageId === msg.id
                                  ? strings.share
                                  : strings.share}
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveAsPdf}
                              className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3 py-[6px] text-[12px] font-medium text-[var(--chat-text-2)] outline-none transition-colors hover:bg-[var(--chat-hover)]"
                            >
                              <Download size={12} strokeWidth={2} />
                              {strings.savePdf}
                            </button>

                            <button
                              type="button"
                              onClick={handleNewChat}
                              className="inline-flex min-h-9 items-center gap-1.5 px-2 py-[6px] text-[12px] font-medium text-[var(--chat-muted)] outline-none transition-colors hover:bg-[var(--chat-hover)]"
                            >
                              <RotateCcw size={12} strokeWidth={2} />
                              {strings.newChat}
                            </button>
                          </div>

                          <AnswerFeedback
                            messageId={msg.id}
                            question={question}
                            citedLaws={sources.map((source) => source.citation || source.title)}
                            language={language}
                          />
                        </>
                      )}
                    </motion.div>
                  );
                })}

                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mx-auto flex w-full max-w-[820px] flex-col gap-3"
                    >
                      <GeneratingRow label={strings.generating} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {hasConversation && (
          <ScrollDownButton
            onClick={() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' })}
          />
        )}

        <ComposerFrame
          emergency={
            <AnimatePresence>
              {emergencyRisk.level === 'urgent' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 border border-[var(--chat-danger-border)] bg-[var(--chat-danger-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--chat-danger-text)]" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-[var(--chat-danger-text)]">{strings.urgentHelp}</p>
                          <span className="border border-[var(--chat-danger-border)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--chat-danger-text)]">112</span>
                        </div>
                        <p className="mt-1 text-[12px] leading-5 text-[var(--chat-danger-text)] opacity-85">{strings.urgentGuidance}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenEmergency}
                      className="min-h-10 shrink-0 border border-[var(--chat-danger-border)] px-3 text-[12px] font-semibold text-[var(--chat-danger-text)] transition-colors hover:bg-[var(--chat-danger-bg)]"
                    >
                      {strings.openEmergencyContacts}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col">
            {showShareNotice && shareNotice && (
              <div className="mb-2 flex items-center justify-between gap-3 border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3 py-2 text-[12px] text-[var(--chat-text-2)]">
                <span className="truncate">{shareNotice}</span>
                <button
                  type="button"
                  onClick={() => setShowShareNotice(false)}
                  className="text-[var(--chat-muted)] outline-none hover:text-[var(--chat-text)]"
                  aria-label={strings.dismissNotice}
                >
                  ×
                </button>
              </div>
            )}

            {(emergencyRisk.level === 'urgent' || articleContext) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {emergencyRisk.level === 'urgent' && <ComposerChip label={strings.urgentHelp} />}
                {articleContext && (
                  <ComposerChip
                    label={`${articleContext.referenceNumber || articleContext.lawTitle || 'Article'}${
                      articleContext.articleNumber ? ` · Art. ${articleContext.articleNumber}` : ''
                    }`}
                    onRemove={() => setArticleContext(null)}
                  />
                )}
              </div>
            )}

            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-[var(--chat-muted)]">
                {strings.answerLanguageLabel}
              </span>
              <LanguageMenu value={language} onChange={setLanguage} label={strings.answerLanguageLabel} />
            </div>
            <label htmlFor="rengera-chat-input" className="sr-only">{strings.questionInputLabel}</label>
            <textarea
              id="rengera-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={strings.placeholder}
              rows={1}
              className="scrollbar-hide max-h-32 min-h-[56px] w-full resize-y border-none bg-transparent px-1 py-1 text-[16px] leading-[1.5] text-[var(--chat-text)] outline-none placeholder:text-[var(--chat-muted-2)] sm:min-h-[68px]"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
            />

            <div className="mt-1 flex items-end justify-end gap-2">
              <ComposerActions
                onSend={() => handleSubmit()}
                sendDisabled={!input.trim() || isLoading}
                sending={isLoading}
                sendLabel={strings.sendMessage}
                sendingLabel={strings.sendingMessage}
              />
            </div>
          </form>
        </ComposerFrame>

        <ChatDisclaimer>{strings.disclaimer}</ChatDisclaimer>

        <p className="sr-only" role="status" aria-live="polite">
          {printStatus}
        </p>

        <DeadlinesPanel open={showDeadlines} onClose={() => setShowDeadlines(false)} />
      </ChatFrame>
    </div>
  );
}
