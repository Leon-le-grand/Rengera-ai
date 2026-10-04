'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ShieldAlert,
  Phone,
  RotateCcw,
  Car,
  FileText,
  Home,
  Shield,
  Check,
  Link2,
  Download,
  Sparkles,
} from 'lucide-react';
import type { ElementType } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateLegalAdvice, type LegalSource } from '@/app/actions';
import { shareConsultation } from '@/app/share-actions';
import { detectEmergencyRisk } from '@/lib/safety';
import {
  AssistantBlock,
  ChatDisclaimer,
  ChatFrame,
  ChatStream,
  ChatTopBar,
  ComposerActions,
  ComposerChip,
  ComposerFrame,
  ComposerToolbar,
  ContextChip,
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

interface ChatInterfaceProps {
  /** Opens one article of one law inside the Law Library reader. */
  onOpenLaw?: (lawId: string, articleNumber?: string | null) => void;
}

const INITIAL_MESSAGE: Message = {
  id: 'msg-0',
  role: 'assistant',
  content: `Muraho! I am Rengera, your legal assistant.

Describe your situation in any language. I will read the official Rwandan laws, quote the exact article, and tell you what to do next.`,
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
  const [showShareNotice, setShowShareNotice] = useState(false);
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
    setShowShareNotice(false);
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

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const hasConversation = messages.some((message) => message.role === 'user');

  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      components={{
        h3: ({ node, ...props }) => (
          <h3 className="mt-4 mb-1.5 text-[14px] font-semibold tracking-[-0.01em] text-[#1f1f1f] first:mt-0" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="mt-3 mb-1 text-[13px] font-semibold text-[#1f1f1f]" {...props} />
        ),
        p: ({ node, ...props }) => <p className="mb-2.5 mt-0 text-[13px] leading-[1.65]" {...props} />,
        ul: ({ node, ...props }) => <ul className="my-2 space-y-1.5 pl-0" {...props} />,
        ol: ({ node, ...props }) => <ol className="my-2 list-decimal space-y-1.5 pl-5" {...props} />,
        li: ({ node, ...props }) => (
          <li className="flex gap-2 text-[13px] leading-[1.65]">
            <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-[#5f6368]" />
            <span className="min-w-0">{props.children}</span>
          </li>
        ),
        a: ({ node, ...props }) => (
          <a
            className="text-[#1a73e8] underline underline-offset-2"
            target="_blank"
            rel="noreferrer noopener"
            {...props}
          />
        ),
        strong: ({ node, ...props }) => <strong className="font-semibold text-[#1f1f1f]" {...props} />,
        blockquote: ({ node, ...props }) => (
          <blockquote className="my-2 border-l-2 border-[#e8eaed] pl-3 text-[#5f6368]" {...props} />
        ),
        code: ({ node, ...props }) => (
          <code className="rounded-[4px] bg-[#f1f3f4] px-1 py-[1px] font-mono text-[12px] text-[#3c4043]" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="flex h-full w-full justify-center bg-[#e6e6e6] p-0 sm:p-4">
      <ChatFrame className="chat-print-area h-full max-w-[760px]">
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col">
          <ChatTopBar
            title={hasConversation ? 'Rengera consultation' : 'New Rengera chat'}
            onNewChat={handleNewChat}
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
          />

          <ChatStream>
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
                    <ContextChip icon={<Sparkles size={11} strokeWidth={2.5} />}>
                      Legal consultation
                    </ContextChip>
                    <UserBubble>{msg.content}</UserBubble>
                  </motion.div>
                );
              }

              const sources = msg.sources || [];
              const isWelcome = msg.id === 'msg-0';

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
                      <p className="text-[13px] leading-[1.65] text-[#1f1f1f]">{msg.content}</p>
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
                          className="inline-flex items-center gap-2 rounded-full border border-[#e8eaed] bg-white px-3 py-[7px] text-[12px] font-medium text-[#3c4043] outline-none transition-colors hover:bg-[#f1f3f4]"
                        >
                          <scenario.icon size={13} strokeWidth={2} className="text-[#5f6368]" />
                          {scenario.label}
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
                        items={sources.map((source, index) => ({
                          key: `${source.lawId}-${source.articleNumber ?? index}-${index}`,
                          title: `${source.referenceNumber || source.title}${
                            source.articleNumber ? ` — Article ${source.articleNumber}` : ''
                          }`,
                          icon: <FileText size={12} strokeWidth={2} />,
                          active: index === 0,
                        }))}
                      />
                      {onOpenLaw && (
                        <button
                          type="button"
                          onClick={() => onOpenLaw(sources[0].lawId, sources[0].articleNumber)}
                          className="self-start text-[12px] font-medium text-[#1a73e8] outline-none hover:underline"
                        >
                          Open the full article in the Law Library
                        </button>
                      )}
                    </>
                  )}

                  {!isWelcome && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowShareNotice(true);
                          handleShare(msg);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e8eaed] bg-white px-3 py-[6px] text-[12px] font-medium text-[#3c4043] outline-none transition-colors hover:bg-[#f1f3f4]"
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
                            ? 'Link copied'
                            : 'Share answer'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveAsPdf}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e8eaed] bg-white px-3 py-[6px] text-[12px] font-medium text-[#3c4043] outline-none transition-colors hover:bg-[#f1f3f4]"
                      >
                        <Download size={12} strokeWidth={2} />
                        Save as PDF
                      </button>

                      <button
                        type="button"
                        onClick={handleNewChat}
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-[6px] text-[12px] font-medium text-[#5f6368] outline-none transition-colors hover:bg-[#f1f3f4]"
                      >
                        <RotateCcw size={12} strokeWidth={2} />
                        New chat
                      </button>
                    </div>
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
                  <GeneratingRow label="Reading the law library…" />
                </motion.div>
              )}
            </AnimatePresence>
          </ChatStream>
        </div>

        <ScrollDownButton onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })} />

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
                  <div className="rounded-[16px] border border-[#f1c7c7] bg-[#fdf2f2] p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c5221f] text-white">
                        <ShieldAlert size={15} strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-[#a50e0e]">{emergencyRisk.title}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-[2px] text-[11px] font-medium text-[#a50e0e] ring-1 ring-[#f1c7c7]">
                            <Phone size={10} strokeWidth={2.5} /> Police 112
                          </span>
                          <span className="inline-flex items-center rounded-full bg-white px-2 py-[2px] text-[11px] font-medium text-[#a50e0e] ring-1 ring-[#f1c7c7]">
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
          <form
            onSubmit={handleSubmit}
            className="flex flex-col"
          >
            {showShareNotice && shareNotice && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2 text-[12px] text-[#3c4043] ring-1 ring-[#e8eaed]">
                <span className="truncate">{shareNotice}</span>
                <button
                  type="button"
                  onClick={() => setShowShareNotice(false)}
                  className="text-[#5f6368] outline-none hover:text-[#1f1f1f]"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            {emergencyRisk.level === 'urgent' && (
              <div className="mb-2">
                <ComposerChip label="Urgent case" />
              </div>
            )}

            <label htmlFor="rengera-chat-input" className="sr-only">
              Ask Rengera a legal question
            </label>
            <textarea
              id="rengera-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your rights…"
              rows={1}
              className="scrollbar-hide max-h-32 min-h-[40px] w-full resize-none border-none bg-transparent px-1 py-1 text-[16px] leading-[1.5] text-[#1f1f1f] outline-none placeholder:text-[#9aa0a6]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
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

        <ChatDisclaimer>
          Rengera AI can make mistakes. Verify important information with official sources.
        </ChatDisclaimer>

        <p className="sr-only" role="status" aria-live="polite">
          {printStatus}
        </p>
      </ChatFrame>
    </div>
  );
}
