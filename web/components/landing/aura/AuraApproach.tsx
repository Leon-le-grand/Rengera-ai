'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import RengeraLogo from '@/components/brand/RengeraLogo';
import { useTheme } from '@/components/app/ThemeProvider';
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
  const { theme } = useTheme();
  const light = theme === 'light';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % STEPS.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      id="approach"
      className={cn(
        'relative w-full scroll-mt-24 overflow-hidden py-24',
        light
          ? 'bg-[radial-gradient(120%_120%_at_15%_0%,#f7f6f3_0%,#efede9_55%,#e2e0da_100%)] text-zinc-950'
          : 'bg-[radial-gradient(120%_120%_at_15%_0%,#101a2c_0%,#0a1120_45%,#05070d_100%)] text-white',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80')] bg-cover bg-center",
          light ? 'opacity-[0.16]' : 'opacity-[0.07]',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent',
          light ? 'from-[#efede9] to-[#efede9]' : 'from-[#05070d] to-[#05070d]',
        )}
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col items-center px-6">
        <AuraReveal className="text-center">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px w-12 bg-[#d8b485]" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8a6a30]">
              Our Architecture
            </p>
            <div className="h-px w-12 bg-[#d8b485]" />
          </div>
          <h2 className={cn('text-4xl font-extrabold tracking-tight md:text-6xl', light ? 'text-zinc-950' : 'text-white')}>Our Approach</h2>
          <p className={cn('mx-auto mt-4 max-w-xl text-base font-medium md:text-lg', light ? 'text-zinc-600' : 'text-zinc-400')}>
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
              stroke={light ? 'rgba(138,106,48,0.6)' : 'rgba(216,180,133,0.35)'}
              strokeWidth={light ? 1.5 : 1}
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
                'absolute inline-flex items-center gap-2.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold shadow-[0_2px_12px_-4px_rgba(24,24,27,0.3)] transition-all duration-300',
                step.pill.className,
                index === active
                  ? 'bg-[#d8b485] text-zinc-950'
                  : light
                    ? 'border border-zinc-950/20 bg-[#f7f6f3] text-zinc-700 hover:border-[#8a6a30]/60 hover:text-zinc-950'
                    : 'border border-white/15 bg-white/5 text-zinc-300 hover:border-[#d8b485]/50 hover:text-white',
              )}
            >
              <span className={cn('text-xs font-extrabold', index === active ? 'text-zinc-700' : 'text-[#8a6a30]')}>
                {step.number}
              </span>
              {step.title}
            </button>
          ))}

          <div className="absolute inset-0 flex flex-col items-center justify-center px-[17%] text-center">
            <span className={cn('mb-6 block h-14 w-px', light ? 'bg-zinc-950/20' : 'bg-white/15')} />
            <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
              <span className={cn('absolute inset-0 rounded-full', light ? 'bg-[#f7f6f3] shadow-[0_0_60px_18px_rgba(138,106,48,0.18)]' : 'bg-[#05070d] shadow-[0_0_60px_18px_rgba(216,180,133,0.12)]')} />
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
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8a6a30]">
                  Step {STEPS[active].number}
                </p>
                <h3 className={cn('text-4xl font-extrabold tracking-tight md:text-5xl', light ? 'text-zinc-950' : 'text-white')}>
                  {STEPS[active].title}
                </h3>
                <p className={cn('mx-auto mt-4 max-w-[360px] text-base font-medium leading-relaxed md:text-[17px]', light ? 'text-zinc-600' : 'text-zinc-300')}>
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
            className={cn(
              'inline-flex w-full items-center justify-center border-b pb-1 text-[11px] font-extrabold uppercase tracking-widest transition-colors sm:w-auto',
              light
                ? 'border-zinc-950/30 text-zinc-950 hover:border-zinc-950'
                : 'border-white/30 text-white hover:border-white',
            )}
          >
            See The Coverage
          </a>
        </AuraReveal>
      </div>
    </section>
  );
}