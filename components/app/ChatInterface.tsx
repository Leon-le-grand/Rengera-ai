'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  User,
  Loader2,
  Download,
  ArrowRight,
  ShieldAlert,
  Phone,
  RotateCcw,
  Car,
  FileText,
  Home,
  Shield,
  BookOpen,
  Check,
  Link2,
} from 'lucide-react';
import type { ElementType } from 'react';
import ReactMarkdown from 'react-markdown';
import RengeraLogo from '@/components/brand/RengeraLogo';
import { generateLegalAdvice, type LegalSource } from '@/app/actions';
import { shareConsultation } from '@/app/share-actions';
import { cn } from '@/lib/utils';
import { detectEmergencyRisk } from '@/lib/safety';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: LegalSource[];
}

interface ChatInterfaceProps {
  /** Opens one article of one law inside the Law Library reader. */
  onOpenLaw?: (lawId: string, articleNumber?: string | null) => void;
}

const INITIAL_MESSAGE: Message = {
  id: 'msg-0',
  role: 'assistant',
  content: `Muraho! I am Rengera, your legal assistant.

How can I help you understand your rights today? You can type your situation below, or select a common scenario:`,
};

const SESSION_STORAGE_KEY = 'rengera_ai_chat_session_v1';

const SCENARIOS: { id: string; label: string; icon: ElementType; prompt: string }[] = [
  {
    id: 'tenant',
    label: 'Tenant problem',
    icon: Home,
    prompt: 'My landlord locked me out. What are my rights?',
  },
  {
    id: 'employment',
    label: 'Employment',
    icon: FileText,
    prompt: 'My employer refuses to pay me for overtime. What should I do?',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Shield,
    prompt: 'Someone shared my private photos without my consent. Is this illegal?',
  },
  {
    id: 'traffic',
    label: 'Traffic',
    icon: Car,
    prompt: 'The police stopped me and asked for a bribe. What are my rights?',
  },
];

function loadStoredMessages(): Message[] {
  if (typeof window === 'undefined') return [INITIAL_MESSAGE];

  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [INITIAL_MESSAGE];
    const parsed = JSON.parse(stored) as { messages?: Message[] };
    return Array.isArray(parsed.messages) && parsed.messages.length > 0
      ? parsed.messages
      : [INITIAL_MESSAGE];
  } catch {
    return [INITIAL_MESSAGE];
  }
}

export default function ChatInterface({ onOpenLaw }: ChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [printStatus, setPrintStatus] = useState('');
  const [sharingMessageId, setSharingMessageId] = useState<string | null>(null);
  const [sharedMessageId, setSharedMessageId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const emergencyRisk = detectEmergencyRisk(input);

  useEffect(() => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ messages, updatedAt: new Date().toISOString() }),
    );
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    const query = presetPrompt || input.trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!presetPrompt) setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((message) => message.id !== 'msg-0')
        .map((message) => ({
          role: message.role === 'user' ? 'user' : 'model',
          content: message.content,
        })) as { role: 'user' | 'model'; content: string }[];

      const answer = await generateLegalAdvice(userMessage.content, history);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer.reply || "I couldn't generate a response. Please try again.",
        sources: answer.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      try {
        await navigator.clipboard.writeText(result.shareUrl || '');
        setShareNotice('Link copied to your clipboard.');
      } catch {
        setShareNotice(`Share link: ${result.shareUrl}`);
      }
    } catch (error) {
      setShareNotice(
        error instanceof Error ? error.message : 'The link could not be created.',
      );
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

  const renderMarkdown = (content: string) => (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          h3: ({ node, ...props }) => (
            <h3
              className="mt-6 mb-2 border-b border-emerald-100 pb-1 text-sm font-bold uppercase tracking-wider text-emerald-700"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-4 text-[15px] leading-relaxed text-slate-700" {...props} />
          ),
          ul: ({ node, ...props }) => <ul className="mb-4 space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="mb-4 list-decimal space-y-2 pl-5" {...props} />,
          li: ({ node, ...props }) => (
            <li className="flex items-start gap-2 text-[15px] text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{props.children}</span>
            </li>
          ),
          a: ({ node, ...props }) => (
            <a
              className="font-medium text-emerald-700 underline underline-offset-2 transition hover:text-emerald-900"
              target="_blank"
              rel="noreferrer noopener"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-slate-900" {...props} />
          ),
          code: ({ node, ...props }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="chat-print-area flex h-full flex-col bg-white">
      <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/25">
            <MessageSquareGlyph />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">AI Legal Assistant</p>
            <p className="truncate text-xs text-slate-500">
              Answers cite the exact article and official source.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-0"
        >
          <RotateCcw size={14} strokeWidth={2.25} />
          New chat
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-hide flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'mt-1 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl',
                    msg.role === 'user'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-emerald-600 shadow-md shadow-emerald-600/25',
                  )}
                >
                  {msg.role === 'user' ? (
                    <User size={18} strokeWidth={2.25} />
                  ) : (
                    <RengeraLogo size={34} label="" />
                  )}
                </div>

                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-5 py-4',
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-slate-900 text-white'
                      : 'rounded-tl-sm border border-slate-200 bg-white shadow-sm',
                  )}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>
                      {renderMarkdown(msg.content)}

                      {msg.id === 'msg-0' && messages.length === 1 && (
                        <motion.div
                          initial="hidden"
                          animate="shown"
                          variants={{
                            hidden: {},
                            shown: { transition: { staggerChildren: 0.06 } },
                          }}
                          className="mt-5 flex flex-col gap-2"
                        >
                          {SCENARIOS.map((scenario) => (
                            <motion.button
                              key={scenario.id}
                              variants={{
                                hidden: { opacity: 0, x: -8 },
                                shown: { opacity: 1, x: 0 },
                              }}
                              onClick={() => handleSubmit(undefined, scenario.prompt)}
                              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white">
                                  <scenario.icon size={16} strokeWidth={2.25} />
                                </span>
                                <span className="truncate text-[15px] font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                                  {scenario.label}
                                </span>
                              </span>
                              <ArrowRight
                                size={16}
                                className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600"
                              />
                            </motion.button>
                          ))}
                        </motion.div>
                      )}

                      {msg.id !== 'msg-0' && msg.sources && msg.sources.length > 0 && (
                        <div className="no-print mt-5 border-t border-slate-100 pt-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            Sources in the law library
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, index) => (
                              <button
                                key={`${source.lawId}-${source.articleNumber}-${index}`}
                                type="button"
                                disabled={!onOpenLaw}
                                onClick={() => onOpenLaw?.(source.lawId, source.articleNumber)}
                                title={source.citation}
                                className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-xs font-semibold text-emerald-800 transition-all duration-200 hover:-translate-y-px hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-90 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                              >
                                <BookOpen size={13} strokeWidth={2.5} className="shrink-0" />
                                <span className="truncate">
                                  {source.referenceNumber || source.title}
                                </span>
                                {source.articleNumber && (
                                  <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
                                    Art. {source.articleNumber}
                                  </span>
                                )}
                                {onOpenLaw && (
                                  <ArrowRight
                                    size={13}
                                    strokeWidth={2.5}
                                    className="shrink-0 text-emerald-500 transition-transform duration-200 group-hover:translate-x-0.5"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-slate-400">
                            Tap a source to read the full article in the Law Library.
                          </p>
                        </div>
                      )}

                      {msg.id !== 'msg-0' && (
                        <div className="no-print mt-5 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleShare(msg)}
                            disabled={sharingMessageId === msg.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
                          >
                            {sharingMessageId === msg.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : sharedMessageId === msg.id ? (
                              <Check size={16} className="text-emerald-600" />
                            ) : (
                              <Link2 size={16} />
                            )}
                            {sharingMessageId === msg.id
                              ? 'Creating link\u2026'
                              : sharedMessageId === msg.id
                                ? 'Link copied'
                                : 'Share answer'}
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveAsPdf}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-0"
                          >
                            <Download size={16} strokeWidth={2.25} />
                            Save as PDF
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="no-print flex gap-3"
              >
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 shadow-md shadow-emerald-600/25">
                  <RengeraLogo size={34} loading label="" />
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: dot * 0.16,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    Consulting the legal database…
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="no-print shrink-0 border-t border-slate-200 bg-white p-4">
        <div className="relative mx-auto max-w-3xl">
          <AnimatePresence>
            {emergencyRisk.level === 'urgent' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-950 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
                      <ShieldAlert size={17} strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{emergencyRisk.title}</p>
                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                          <Phone size={12} strokeWidth={2.5} /> Police 112
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                          RIB 166
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-red-800">
                        If someone is in immediate danger, contact official emergency services before
                        continuing the chat.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-all duration-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your legal situation…"
              className="scrollbar-hide min-h-[56px] max-h-32 w-full resize-none border-none bg-transparent px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.9 }}
              disabled={!input.trim() || isLoading}
              className="mb-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 transition-all duration-200 hover:bg-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} strokeWidth={2.25} className="ml-0.5" />
              )}
            </motion.button>
          </form>

          <p className="mt-3 text-center text-xs font-medium text-slate-400">
            Rengera AI can make mistakes. Verify important information with official sources.
          </p>
          <p className="sr-only" role="status" aria-live="polite">
            {printStatus}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small inline mark so the header does not depend on a large glyph set. */
function MessageSquareGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}
