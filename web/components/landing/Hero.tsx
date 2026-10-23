'use client';

import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import RibbonGlow from '@/components/brand/RibbonGlow';
import RadialRevealButton from '@/components/brand/RadialRevealButton';
import RotatingText from '@/components/brand/RotatingText';
import LegalChatPreview from './LegalChatPreview';

export default function Hero({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 pb-20 pt-32 md:pb-28 md:pt-40">
      {/* The ribbon and its scrim are z-0 and the copy is z-10. The previous
          `-z-10` pushed the canvas behind the section's own slate background,
          so it painted but was never visible. */}
      <RibbonGlow
        className="absolute inset-0 z-0"
        background="#070A14"
        color1="#10b981"
        color2="#b69d74"
        speed={34}
        size={118}
        angle={-140}
        hover={110}
        reach={280}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-slate-950/30 via-slate-950/75 to-slate-950" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:gap-12">
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2 text-sm font-semibold text-emerald-200">
              <ShieldCheck size={16} strokeWidth={2.5} />
              Know Your Rights. Protect Your Future.
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              Understand Rwanda's Laws in{' '}
              <span className="text-emerald-400">Minutes</span>, Not{' '}
              <RotatingText
                texts={['Hours', 'Weeks', 'Months']}
                accent="#b69d74"
                intervalMs={2400}
                className="inline-block"
              />
            </h1>

            <p className="mx-auto mb-10 mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl lg:mx-0">
              Rengera turns complex legal language into simple, practical guidance. Every answer
              cites the exact article of the exact law, so you can read it yourself.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <RadialRevealButton
                onClick={onStartFree}
                ariaLabel="Start free"
                rounded={100}
                fill="#059669"
                hoverFill="#ffffff"
                textColor="#ffffff"
                hoverTextColor="#065f46"
                padding="1rem 2.25rem"
                duration={0.5}
                className="text-lg shadow-lg shadow-emerald-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Start Free
                <ArrowRight size={19} strokeWidth={2.5} />
              </RadialRevealButton>

              <button
                type="button"
                onClick={() =>
                  document.getElementById('interactive-demo')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="w-full rounded-full border border-white/20 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-px hover:border-white/40 hover:bg-white/5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
              >
                Watch Demo
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-400 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-400" /> Source-linked guidance
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-400" /> Read the law yourself
              </span>
            </div>
          </motion.div>

          <motion.div
            className="flex-1 w-full lg:max-w-md"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          >
            <LegalChatPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
