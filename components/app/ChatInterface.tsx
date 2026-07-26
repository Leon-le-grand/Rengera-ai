'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Loader2, Download, Scale } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateLegalAdvice } from '@/app/actions';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'msg-0',
  role: 'assistant',
  content: `Muraho! I am Rengera, your legal assistant. 

How can I help you understand your rights today? You can ask me questions about:
- Employment and Labour
- Rent and Housing
- Family and Marriage
- Business Compliance

*Note: I provide legal education based on Rwandan laws, not formal legal advice.*`
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate network delay for UX
      await new Promise(r => setTimeout(r, 600));
      const responseText = await generateLegalAdvice(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || "I couldn't generate a response. Please try again."
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarkdown = (content: string) => {
    return (
      <div className="markdown-body">
        <ReactMarkdown
          components={{
            h3: ({ node, ...props }) => <h3 className="text-emerald-700 font-bold text-sm uppercase tracking-wider mt-6 mb-2 border-b border-emerald-100 pb-1" {...props} />,
            p: ({ node, ...props }) => <p className="text-slate-700 leading-relaxed mb-4 text-[15px]" {...props} />,
            ul: ({ node, ...props }) => <ul className="space-y-2 mb-4" {...props} />,
            li: ({ node, ...props }) => (
              <li className="flex items-start gap-2 text-slate-700 text-[15px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span>{props.children}</span>
              </li>
            ),
            strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-hide">
        <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-10">
          
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1",
                  msg.role === 'user' 
                    ? "bg-slate-100 text-slate-600" 
                    : "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                )}>
                  {msg.role === 'user' ? <User size={20} /> : <Scale size={20} />}
                </div>

                {/* Message Bubble */}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-6 py-4",
                  msg.role === 'user' 
                    ? "bg-slate-900 text-white rounded-tr-sm" 
                    : "bg-white border border-slate-200 shadow-sm rounded-tl-sm"
                )}>
                  {msg.role === 'user' ? (
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>
                      {renderMarkdown(msg.content)}
                      
                      {msg.id !== 'msg-0' && (
                        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                          <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <Download size={16} /> Save as PDF
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-md">
                <Bot size={20} />
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm px-6 py-5 flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                <span className="text-sm text-slate-500 font-medium">Consulting legal database...</span>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-3xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your legal situation..."
              className="w-full bg-transparent border-none resize-none px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:outline-none min-h-[56px] max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mb-1 mr-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
            >
              <Send size={18} className={input.trim() && !isLoading ? "ml-0.5" : ""} />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-slate-400 font-medium">
            Rengera AI can make mistakes. Verify important information with official sources.
          </div>
        </div>
      </div>

    </div>
  );
}
