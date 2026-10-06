'use client';

import { useState } from 'react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import AuraReveal from './AuraReveal';
import GhostWord, { GhostLabel } from './GhostWord';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    question: 'Is Rengera a replacement for a lawyer?',
    answer:
      'No, and it is not trying to be. Rengera explains the law in plain language and shows you the exact article so you can read the official text yourself. For a court case, a contract you are about to sign, or anything with a serious financial penalty, talk to a lawyer — we will tell you when that is the case.',
  },
  {
    question: 'Where does the law in your answers come from?',
    answer:
      'Every answer is retrieved from official Rwandan legislation stored in our library, split article by article and linked to its gazette reference. If the law we need is not in the database, Rengera says so instead of guessing.',
  },
  {
    question: 'Which languages can I use?',
    answer:
      'English, Kinyarwanda and French. Choose your language in the chat and the answer is written in that language while the law reference and article numbers stay exactly as published.',
  },
  {
    question: 'Can I trust a law that has an amendment?',
    answer:
      'Yes. We store amendments and the articles they affect, and the answer tells you when a later law changes an earlier one. You will also see a Verified badge on any law an administrator has reviewed by hand.',
  },
  {
    question: 'Is what I type saved?',
    answer:
      'A question is stored so we can measure how the product is used and so we can fix the answers people rate as wrong. Anything you upload for review is processed in memory and is never stored.',
  },
  {
    question: 'I run a business. Can I use this for contracts?',
    answer:
      'Yes. Upload an employment contract, a tenancy agreement or a court notice and Rengera flags what is unlawful, missing or risky under Rwandan law, with the article it relies on.',
  },
];

export default function AuraFAQ({ onStartFree }: { onStartFree: () => void }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative w-full scroll-mt-24 overflow-hidden border-b border-white/5 px-6 py-24"
    >
      {/* The oversized word behind the section */}
      <GhostWord word="FAQ" className="right-[-4%] top-10 md:left-[-2%] md:right-auto" />

      <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="relative">
          <GhostLabel className="mb-8">FAQ</GhostLabel>
          <AuraReveal>
            <h2 className="mb-6 text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Questions people ask before they trust it.
            </h2>
          </AuraReveal>
          <AuraReveal delay={0.05}>
            <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
              Legal help only works if you can trust where it came from. These are the honest answers,
              not the marketing ones.
            </p>
          </AuraReveal>
        </div>

        <div className="relative border-t border-white/5">
          {FAQS.map((item, index) => {
            const isOpen = open === index;

            return (
              <AuraReveal key={item.question} delay={index * 0.04}>
                <div className="border-b border-white/5">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left outline-none transition-colors hover:text-[#d8b485]"
                  >
                    <span className="text-sm font-medium text-white transition-colors hover:text-[#d8b485]">
                      {item.question}
                    </span>
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center border transition-colors',
                        isOpen ? 'border-[#d8b485] text-[#d8b485]' : 'border-white/15 text-zinc-400',
                      )}
                    >
                      {isOpen ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
                    </span>
                  </button>

                  <div
                    className={cn(
                      'grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      isOpen ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pr-10 text-sm font-light leading-relaxed text-zinc-400">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </AuraReveal>
            );
          })}
        </div>
      </div>

      {/* The call to action that closes the page */}
      <div className="relative mx-auto mt-20 w-full max-w-[1400px]">
        <AuraReveal>
          <div className="force-dark relative overflow-hidden border border-white/5">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-[0.18]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/85 to-transparent" />

            <div className="relative flex flex-col items-start gap-8 p-10 md:flex-row md:items-center md:justify-between md:p-16">
              <div className="max-w-xl">
                <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#d8b485]">
                  Start in 30 seconds
                </p>
                <h3 className="text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-4xl">
                  You already know something is wrong. Ask the law.
                </h3>
                <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-300">
                  No card, no lawyer needed to start. Ask in Kinyarwanda, English or French,
                  and read the article yourself.
                </p>
              </div>

              <button
                type="button"
                onClick={onStartFree}
                className="aura-lift inline-flex w-full shrink-0 items-center justify-center gap-2 bg-[#d8b485] px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-zinc-950 hover:bg-[#c2a277] md:w-auto"
              >
                Ask your first question
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </AuraReveal>
      </div>
    </section>
  );
}