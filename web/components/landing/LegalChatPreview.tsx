'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Scale, FileText, ShieldCheck } from 'lucide-react';
import type { ElementType } from 'react';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  /** Optional short label shown instead of a timestamp. */
  tag?: string;
}

interface EvidenceLink {
  label: string;
  detail: string;
}

const MESSAGES: ChatMessage[] = [
  {
    sender: 'user',
    text: 'My landlord locked me out because I am two days late on rent. Is that legal?',
  },
  {
    sender: 'assistant',
    text: 'No. A landlord cannot change the locks or remove a tenant without a court order, even when rent is unpaid. The law requires a notice period and a court decision first.',
  },
];

const EVIDENCE: EvidenceLink[] = [
  {
    label: 'Law regulating residential property',
    detail: 'Article 45 — eviction without a court order',
  },
];

const NEXT_STEPS: { icon: ElementType; text: string }[] = [
  { icon: FileText, text: 'Photograph the locked door and any notice' },
  { icon: ShieldCheck, text: 'Report the case to your sector police' },
];

export default function LegalChatPreview() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="w-full max-w-md rounded-[1.65rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <Scale size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">Legal Assistant</p>
          <p className="truncate text-xs text-slate-500">Answers cite the exact article</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {MESSAGES.map((message, index) => {
          const isUser = message.sender === 'user';

          return (
            <motion.div
              key={index}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'rounded-tr-sm bg-slate-900 text-white'
                    : 'rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {message.text}
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-start"
        >
          <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-emerald-200 bg-emerald-50/70 px-4 py-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Backed by law
            </p>

            <div className="space-y-1.5">
              {EVIDENCE.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-2 text-xs ring-1 ring-emerald-100"
                >
                  <Scale size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-800">{item.label}</span>
                    <span className="block text-slate-500">{item.detail}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 space-y-1.5">
              {NEXT_STEPS.map((step) => (
                <div key={step.text} className="flex items-center gap-2 px-1 text-xs text-slate-600">
                  <step.icon size={13} strokeWidth={2.5} className="shrink-0 text-emerald-600" />
                  {step.text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <p className="truncate text-sm text-slate-400">Describe your legal situation…</p>
      </motion.div>
    </div>
  );
}