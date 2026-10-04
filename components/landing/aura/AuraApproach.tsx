'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import RengeraLogo from '@/components/brand/RengeraLogo';
import AuraReveal from './AuraReveal';
import { cn } from '@/lib/utils';

/**
 * "Our Approach" — the workflow orbit.
 *
 * Geometry is taken straight from the reference: three numbered nodes on a
 * dashed circle (top, bottom-right, bottom-left), a solid white arc sweeping
 * clockwise from the first node to the last, the active node rendered as a black
 * pill, and the active step written in the middle of the circle. The Rengera
 * mark sits at the centre of that circle, lit by the same halo treatment used in
 * the dark brand section.
 */

const STEPS = [
  {
    number: '01',
    title: 'Find the law',
    description: 'Tell Rengera what happened, in your own words.',
    pill: { left: '50%', top: '12.5%', className: '-translate-x-1/2 -translate-y-[190%]' },
    dot: { cx: 200, cy: 50 },
  },
  {
    number: '02',
    title: 'Read the article',
    description: 'We pull the exact clause from official Rwandan law.',
    pill: { left: '82.48%', top: '68.75%', className: 'translate-x-[18%] translate-y-[10%]' },
    dot: { cx: 329.9, cy: 275 },
  },
  {
    number: '03',
    title: 'Act with proof',
    description: 'You get the next step, and the citation to back it up.',
    pill: { left: '17.52%', top: '68.75%', className: '-translate-x-[118%] translate-y-[10%]' },
    dot: { cx: 70.1, cy: 275 },
  },
];

export default function AuraApproach({ onStartFree }: { onStartFree: () => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % STEPS.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      id="approach"
      className="relative w-full scroll-mt-24 overflow-hidden bg-[radial-gradient(120%_120%_at_15%_0%,#FF7A18_0%,#F4551A_45%,#DE3A11_100%)] py-24 text-white"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-6">
        <AuraReveal className="text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-6xl">Our Approach</h2>
          <p className="mt-4 text-base text-white/85 md:text-lg">Stop guessing. Start citing.</p>
        </AuraReveal>

        <div className="relative mt-10 aspect-square w-full max-w-[620px]">
          {/* Orbit */}
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
            <circle
              cx="200"
              cy="200"
              r="150"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1"
              strokeDasharray="3 7"
              strokeLinecap="round"
            />
            <motion.path
              d="M 200 50 A 150 150 0 1 1 70.1 275"
              fill="none"
              stroke="#ffffff"
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
                fill="#000000"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.15 }}
                style={{ transformOrigin: `${step.dot.cx}px ${step.dot.cy}px` }}
              />
            ))}
          </svg>

          {/* Step pills */}
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
                  ? 'bg-black text-white'
                  : 'bg-black/25 text-white/90 hover:bg-black/40',
              )}
            >
              <span className={cn('text-[11px]', index === active ? 'text-white/70' : 'text-white/70')}>
                {step.number}
              </span>
              {step.title}
            </button>
          ))}

          {/* Centre: mark + active step */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
            <span className="mb-6 block h-16 w-px bg-white/40" />
            <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#0b0b0d] shadow-[0_0_60px_18px_rgba(0,0,0,0.35)]" />
              <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />
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
                <h3 className="text-3xl font-bold tracking-tight md:text-4xl">{STEPS[active].title}</h3>
                <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-white/90">
                  {STEPS[active].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <AuraReveal delay={0.1} className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <button
            type="button"
            onClick={onStartFree}
            className="inline-flex w-full items-center justify-center bg-black px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#111] sm:w-auto"
          >
            Run your first question →
          </button>
          <a
            href="#interface"
            className="inline-flex w-full items-center justify-center border-b border-white/60 pb-1 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white sm:w-auto"
          >
            See The Interface
          </a>
        </AuraReveal>
      </div>
    </section>
  );
}