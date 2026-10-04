'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import RengeraLogo from '@/components/brand/RengeraLogo';
import AuraReveal from './AuraReveal';
import { cn } from '@/lib/utils';

/**
 * "Our Approach" — how the RAG architecture actually works.
 *
 * The construction comes straight from the reference: three numbered nodes on a
 * dashed circle (top, bottom-right, bottom-left), a solid arc sweeping clockwise
 * from the first node to the last, the active node drawn as a filled pill, and
 * the active step written in the middle of the circle. The palette is the
 * landing page's own deep navy with the gold accent, so it reads as part of the
 * page instead of a foreign orange block.
 */

const STEPS = [
  {
    number: '01',
    title: 'Ingest the law',
    description:
      'Official Rwandan legislation is uploaded, split into articles, and stored with its citation and gazette reference.',
    pill: { left: '50%', top: '12.5%', className: '-translate-x-1/2 -translate-y-[190%]' },
    dot: { cx: 200, cy: 50 },
  },
  {
    number: '02',
    title: 'Retrieve the article',
    description:
      'Your question is matched against every article we hold. The system pulls the exact clauses that apply — not a summary.',
    pill: { left: '82.48%', top: '68.75%', className: 'translate-x-[18%] translate-y-[10%]' },
    dot: { cx: 329.9, cy: 275 },
  },
  {
    number: '03',
    title: 'Answer with proof',
    description:
      'The model writes plain guidance using only the retrieved text, and every sentence points back to the article it came from.',
    pill: { left: '17.52%', top: '68.75%', className: '-translate-x-[118%] translate-y-[10%]' },
    dot: { cx: 70.1, cy: 275 },
  },
];

export default function AuraApproach({ onStartFree }: { onStartFree: () => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % STEPS.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      id="approach"
      className="relative w-full scroll-mt-24 overflow-hidden bg-[radial-gradient(120%_120%_at_15%_0%,#101a2c_0%,#0a1120_45%,#05070d_100%)] py-24 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-[0.07]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070d] via-transparent to-[#05070d]" />

      <div className="relative mx-auto flex max-w-[1400px] flex-col items-center px-6">
        <AuraReveal className="text-center">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px w-12 bg-[#d8b485]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b485]">
              Our Architecture
            </p>
            <div className="h-px w-12 bg-[#d8b485]" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white md:text-6xl">Our Approach</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-400 md:text-lg">
            A retrieval system, not a chatbot with a good personality. Three steps, no fourth step where
            it invents the law.
          </p>
        </AuraReveal>

        <div className="relative mt-10 aspect-square w-full max-w-[720px]">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
            <circle
              cx="200"
              cy="200"
              r="150"
              fill="none"
              stroke="rgba(216,180,133,0.35)"
              strokeWidth="1"
              strokeDasharray="3 7"
              strokeLinecap="round"
            />
            <motion.path
              d="M 200 50 A 150 150 0 1 1 70.1 275"
              fill="none"
              stroke="#d8b485"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {STEPS.map((step, index) => (
              <motion.circle
                key={step.number}
                cx={step.dot.cx}
                cy={step.dot.cy}
                r="6"
                fill="#d8b485"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.15 }}
                style={{ transformOrigin: `${step.dot.cx}px ${step.dot.cy}px` }}
              />
            ))}
          </svg>

          {STEPS.map((step, index) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActive(index)}
              style={{ left: step.pill.left, top: step.pill.top }}
              className={cn(
                'absolute inline-flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-300',
                step.pill.className,
                index === active
                  ? 'bg-[#d8b485] text-zinc-950'
                  : 'border border-white/15 bg-white/5 text-zinc-300 hover:border-[#d8b485]/50 hover:text-white',
              )}
            >
              <span className={cn('text-[11px]', index === active ? 'text-zinc-700' : 'text-[#d8b485]/70')}>
                {step.number}
              </span>
              {step.title}
            </button>
          ))}

          <div className="absolute inset-0 flex flex-col items-center justify-center px-[17%] text-center">
            <span className="mb-6 block h-14 w-px bg-white/15" />
            <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#05070d] shadow-[0_0_60px_18px_rgba(216,180,133,0.12)]" />
              <RengeraLogo size={56} label="Rengera AI" className="relative" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={STEPS[active].number}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b485]/70">
                  Step {STEPS[active].number}
                </p>
                <h3 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                  {STEPS[active].title}
                </h3>
                <p className="mx-auto mt-4 max-w-[360px] text-base leading-relaxed text-zinc-300 md:text-[17px]">
                  {STEPS[active].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <AuraReveal
          delay={0.1}
          className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:gap-8"
        >
          <button
            type="button"
            onClick={onStartFree}
            className="aura-lift inline-flex w-full items-center justify-center bg-[#d8b485] px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-950 hover:bg-[#c2a277] sm:w-auto"
          >
            Run your first question →
          </button>
          <a
            href="#coverage"
            className="inline-flex w-full items-center justify-center border-b border-white/30 pb-1 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white sm:w-auto"
          >
            See The Coverage
          </a>
        </AuraReveal>
      </div>
    </section>
  );
}