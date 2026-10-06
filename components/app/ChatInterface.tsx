'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlarmClock,
  Car,
  Check,
  Download,
  FileText,
  Home,
  Link2,
  Loader2,
  Phone,
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
  ComposerToolbar,
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
}

/** A question handed over from the Law Library: "explain this article to me". */
export interface PendingArticleAsk {
  prompt: string;
  context: ArticleContext;
}

interface ChatInterfaceProps {
  /** Opens one article of one law inside the Law Library reader. */
  onOpenLaw?: (lawId: string, articleNumber?: string | null) => void;
  /** Set when the user asks a follow-up from inside a law. */
  pendingAsk?: PendingArticleAsk | null;
  onPendingAskHandled?: () => void;
}

const SESSION_STORAGE_KEY = 'rengera_ai_chat_session_v1';
const HISTORY_STORAGE_KEY = 'rengera_ai_chat_history_v1';

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

function loadStoredHistory(): StoredChat[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(stored || '[]') as StoredChat[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

const SCENARIOS: { id: string; label: keyof ReturnType<typeof labelsFor>; icon: ElementType; prompt: string }[] = [
  { id: 'tenant', label: 'tenant', icon: Home, prompt: 'My landlord locked me out. What are my rights?' },
  { id: 'employment', label: 'employment', icon: FileText, prompt: 'My employer refuses to pay me for overtime. What should I do?' },
  { id: 'privacy', label: 'privacy', icon: Shield, prompt: 'Someone shared my private photos without my consent. Is this illegal?' },
  { id: 'traffic', label: 'traffic', icon: Car, prompt: 'The police stopped me and asked for a bribe. What are my rights?' },
];

function labelsFor(language: AnswerLanguage) {
  return UI_STRINGS[language].scenarios;
}

function greetingFor(language: AnswerLanguage): Message {
  return { id: 'msg-0', role: 'assistant', content: UI_STRINGS[language].greeting };
}

function loadStoredMessages(): Message[] {
  if (typeof window === 'undefined') return [greetingFor('en')];

  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
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
  pendingAsk = null,
  onPendingAskHandled,
}: ChatInterfaceProps = {}) {
  const [language, setLanguage] = useStoredLanguage();
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
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
  const [history, setHistory] = useState<StoredChat[]>(loadStoredHistory);
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
      SESSION_STORAGE_KEY,
      JSON.stringify({ messages, updatedAt: new Date().toISOString() }),
    );
  }, [messages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
    } catch {
      // Non-fatal: history stays in memory.
    }
  }, [history]);

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
      };

      setMessages((prev) => [...prev, assistantMessage]);

      void logUsageEvent({
        eventType: 'answer_given',
        language,
        surface: 'chat',
        query,
        sessionId: sessionId.current,
        lawReferences: (answer.sources || []).map(
          (source) => `${source.referenceNumber || source.title}${source.articleNumber ? ` Art. ${source.articleNumber}` : ''}`,
        ),
      });
    } catch (error) {
      console.error(error);
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
      void logUsageEvent({ eventType: 'share_created', language, surface: 'chat', sessionId: sessionId.current });

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

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const hasConversation = messages.some((message) => message.role === 'user');

  const openLaw = (lawId: string, articleNumber?: string | null) => {
    onOpenLaw?.(lawId, articleNumber);
    void logUsageEvent({ eventType: 'law_opened', language, surface: 'chat', sessionId: sessionId.current });
  };

  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      components={{
        h3: ({ node, ...props }) => (
          <h3 className="mt-4 mb-1.5 text-[14px] font-semibold tracking-[-0.01em] text-[var(--chat-text)] first:mt-0" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="mt-3 mb-1 text-[13px] font-semibold text-[var(--chat-text)]" {...props} />
        ),
        p: ({ node, ...props }) => <p className="mb-2.5 mt-0 text-[13px] leading-[1.65]" {...props} />,
        ul: ({ node, ...props }) => <ul className="my-2 space-y-1.5 pl-0" {...props} />,
        ol: ({ node, ...props }) => <ol className="my-2 list-decimal space-y-1.5 pl-5" {...props} />,
        li: ({ node, ...props }) => (
          <li className="flex gap-2 text-[13px] leading-[1.65]">
            <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--chat-muted)]" />
            <span className="min-w-0">{props.children}</span>
          </li>
        ),
        a: ({ node, ...props }) => (
          <a className="text-[#1a73e8] underline underline-offset-2" target="_blank" rel="noreferrer noopener" {...props} />
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
    <div className="relative flex h-full w-full justify-center bg-[var(--chat-surround)] p-0 sm:p-4">
      <ChatFrame className="chat-print-area relative h-full max-w-[980px]">
        <LawChangeBanner />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative">
            <ChatTopBar
              title={hasConversation ? 'Rengera consultation' : 'New Rengera chat'}
              onNewChat={() => setShowHistory((v) => !v)}
              onEdit={handleNewChat}
              onShare={() => {
                if (lastAssistant && lastAssistant.id !== 'msg-0') {
                  setShowShareNotice(true);
                  handleShare(lastAssistant);
                } else {
                  setShareNotice('Ask a question first, then share the answer.');
                  setShowShareNotice(true);
                }
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeadlines(true)}
                aria-label="Open deadlines"
                className="hidden h-8 w-8 items-center justify-center rounded-full text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-chip)] hover:text-[var(--chat-text)] sm:flex"
              >
                <AlarmClock size={15} strokeWidth={2} />
              </button>
              <LanguageMenu value={language} onChange={setLanguage} className="ml-auto sm:ml-0" />
            </ChatTopBar>

            {showHistory && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
                <div className="absolute left-4 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-[var(--chat-border)] bg-[var(--chat-panel)] shadow-xl">
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="flex w-full items-center gap-2 border-b border-[var(--chat-border-soft)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--chat-text)] transition-colors hover:bg-[var(--chat-chip)]"
                  >
                    + New chat
                  </button>
                  <div className="max-h-64 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-[var(--chat-muted)]">
                        No previous chats yet.
                      </p>
                    ) : (
                      history.map((chat) => (
                        <div
                          key={chat.id}
                          className="group flex items-center gap-2 border-b border-[var(--chat-border-soft)] px-4 py-2.5 last:border-0 hover:bg-[var(--chat-chip)]"
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
                              {new Date(chat.updatedAt).toLocaleDateString()} ·{' '}
                              {chat.messages.filter((m) => m.role === 'user').length} questions
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChat(chat.id)}
                            aria-label={`Delete ${chat.title}`}
                            className="shrink-0 rounded-full px-2 py-1 text-[11px] text-[var(--chat-muted-2)] opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
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
            <div ref={streamRef} className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-3 pb-5 pt-2 sm:px-5">
                {messages.map((msg) => {
                  if (msg.role === 'user') {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="flex flex-col gap-2"
                      >
                        <UserBubble>{msg.content}</UserBubble>
                      </motion.div>
                    );
                  }

                  const sources = msg.sources || [];
                  const isWelcome = msg.id === 'msg-0';
                  const question = messages[Math.max(0, messages.indexOf(msg) - 1)]?.content || '';
                  const deadlineHints = isWelcome ? [] : extractDeadlineSuggestions(msg.content);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="flex flex-col gap-3"
                    >
                      <AssistantBlock>
                        {isWelcome ? (
                          <p className="text-[13px] leading-[1.65] text-[var(--chat-text)]">{msg.content}</p>
                        ) : (
                          renderMarkdown(msg.content)
                        )}
                      </AssistantBlock>

                      {isWelcome && (
                        <div className="flex flex-wrap gap-2">
                          {SCENARIOS.map((scenario) => (
                            <button
                              key={scenario.id}
                              type="button"
                              onClick={() => handleSubmit(undefined, scenario.prompt)}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--chat-border-soft)] bg-[var(--chat-panel)] px-3 py-[7px] text-[12px] font-medium text-[var(--chat-text-2)] outline-none transition-colors hover:bg-[var(--chat-chip)]"
                            >
                              <scenario.icon size={13} strokeWidth={2} className="text-[var(--chat-muted)]" />
                              {scenarios[scenario.label]}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isWelcome && deadlineHints.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[var(--chat-border-soft)] bg-[var(--chat-panel)] p-3">
                          <AlarmClock size={14} strokeWidth={2} className="text-[#1a73e8]" />
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
                              className="rounded-full bg-[var(--chat-blue-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--chat-blue)] transition-colors hover:bg-[var(--chat-blue-soft)]"
                            >
                              {hint.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isWelcome && sources.length > 0 && (
                        <>
                          <ViewedRow
                            source={
                              sources[0].articleNumber
                                ? `Art. ${sources[0].articleNumber}`
                                : sources[0].referenceNumber || sources[0].title
                            }
                          />
                          <SourceList
                            countLabel={`${sources.length} result${sources.length === 1 ? '' : 's'}`}
                            onSelect={(key) => {
                              const source = sources.find((item) => `${item.lawId}-${item.articleNumber ?? ''}` === key);
                              if (source) openLaw(source.lawId, source.articleNumber);
                            }}
                            items={sources.map((source, index) => ({
                              key: `${source.lawId}-${source.articleNumber ?? index}`,
                              title: `${source.referenceNumber || source.title}${
                                source.articleNumber ? ` — Article ${source.articleNumber}` : ''
                              }`,
                              icon: <FileText size={12} strokeWidth={2} />,
                              active: index === 0,
                              verified: Boolean(source.reviewed),
                            }))}
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            {onOpenLaw && (
                              <button
                                type="button"
                                onClick={() => openLaw(sources[0].lawId, sources[0].articleNumber)}
                                className="text-[12px] font-medium text-[#1a73e8] outline-none hover:underline"
                              >
                                Open the full article in the Law Library
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setArticleContext({
                                  lawTitle: sources[0].title,
                                  referenceNumber: sources[0].referenceNumber,
                                  articleNumber: sources[0].articleNumber,
                                });
                                setInput('Explain this article in simpler words: ');
                              }}
                              className="text-[12px] font-medium text-[#1a73e8] outline-none hover:underline"
                            >
                              Ask a follow-up about this article
                            </button>
                          </div>
                        </>
                      )}

                      {!isWelcome && (
                        <>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowShareNotice(true);
                                handleShare(msg);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--chat-border-soft)] bg-[var(--chat-panel)] px-3 py-[6px] text-[12px] font-medium text-[var(--chat-text-2)] outline-none transition-colors hover:bg-[var(--chat-chip)]"
                            >
                              {sharingMessageId === msg.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : sharedMessageId === msg.id ? (
                                <Check size={12} className="text-[#1a73e8]" />
                              ) : (
                                <Link2 size={12} strokeWidth={2} />
                              )}
                              {sharingMessageId === msg.id
                                ? 'Creating link…'
                                : sharedMessageId === msg.id
                                  ? strings.share
                                  : strings.share}
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveAsPdf}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--chat-border-soft)] bg-[var(--chat-panel)] px-3 py-[6px] text-[12px] font-medium text-[var(--chat-text-2)] outline-none transition-colors hover:bg-[var(--chat-chip)]"
                            >
                              <Download size={12} strokeWidth={2} />
                              {strings.savePdf}
                            </button>

                            <button
                              type="button"
                              onClick={handleNewChat}
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-[6px] text-[12px] font-medium text-[var(--chat-muted)] outline-none transition-colors hover:bg-[var(--chat-chip)]"
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
                      className="flex flex-col gap-3"
                    >
                      <GeneratingRow label={strings.generating} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <ScrollDownButton
          onClick={() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' })}
        />

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
                  <div className="rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-user)] p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c5221f] text-white">
                        <ShieldAlert size={15} strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-[#f0b4b4]">{emergencyRisk.title}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--chat-panel)] px-2 py-[2px] text-[11px] font-medium text-[#e5a3a3] ring-1 ring-[var(--chat-border)]">
                            <Phone size={10} strokeWidth={2.5} /> Police 112
                          </span>
                          <span className="inline-flex items-center rounded-full bg-[var(--chat-panel)] px-2 py-[2px] text-[11px] font-medium text-[#e5a3a3] ring-1 ring-[var(--chat-border)]">
                            RIB 166
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                          If someone is in immediate danger, contact official emergency services before
                          continuing the chat.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col">
            {showShareNotice && shareNotice && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-[10px] bg-[var(--chat-panel)] px-3 py-2 text-[12px] text-[var(--chat-text-2)] ring-1 ring-[var(--chat-border-soft)]">
                <span className="truncate">{shareNotice}</span>
                <button
                  type="button"
                  onClick={() => setShowShareNotice(false)}
                  className="text-[var(--chat-muted)] outline-none hover:text-[var(--chat-text)]"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            {(emergencyRisk.level === 'urgent' || articleContext) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {emergencyRisk.level === 'urgent' && <ComposerChip label="Urgent case" />}
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

            <label htmlFor="rengera-chat-input" className="sr-only">
              Ask Rengera a legal question
            </label>
            <textarea
              id="rengera-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={strings.placeholder}
              rows={1}
              className="scrollbar-hide max-h-32 min-h-[40px] w-full resize-none border-none bg-transparent px-1 py-1 text-[16px] leading-[1.5] text-[var(--chat-text)] outline-none placeholder:text-[var(--chat-muted-2)]"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
            />

            <div className="mt-1 flex items-end justify-between gap-2">
              <ComposerToolbar />
              <ComposerActions
                onSend={() => handleSubmit()}
                sendDisabled={!input.trim() || isLoading}
                sending={isLoading}
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
