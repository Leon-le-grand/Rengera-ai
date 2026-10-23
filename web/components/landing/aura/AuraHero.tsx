'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import RengeraLogo from '@/components/brand/RengeraLogo';
import AuraReveal from './AuraReveal';

/** The word that lands in the card. It cycles: minutes is the promise. */
const CARD_WORDS = ['hours', 'weeks', 'months', 'days'];

export default function AuraHero({ onStartFree }: { onStartFree: () => void }) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((index) => (index + 1) % CARD_WORDS.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      id="home"
      className="relative mx-auto flex w-full max-w-[1400px] scroll-mt-24 flex-col items-start px-6 pb-24 pt-40 text-left"
    >
      {/* Animated grid behind the wordmark */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-[10vw] -top-24 -bottom-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.30]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(216,180,133,0.85) 1px, transparent 1px), linear-gradient(to bottom, rgba(216,180,133,0.85) 1px, transparent 1px)',
            backgroundSize: '110px 110px',
            maskImage: 'radial-gradient(75% 70% at 30% 48%, #000 0%, transparent 82%)',
            WebkitMaskImage: 'radial-gradient(75% 70% at 30% 48%, #000 0%, transparent 82%)',
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(216,180,133,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(216,180,133,0.8) 1px, transparent 1px)',
            backgroundSize: '110px 110px',
            maskImage: 'radial-gradient(42% 40% at 30% 48%, #000 0%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(42% 40% at 30% 48%, #000 0%, transparent 78%)',
          }}
          animate={{ backgroundPosition: ['0px 0px', '110px 110px'] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <AuraReveal className="relative z-10 mb-6 flex items-center gap-4">
        <div className="h-px w-12 bg-[#d8b485]" />
        <p className="text-[10px] font-bold uppercase leading-relaxed tracking-[0.2em] text-[#d8b485]">
          Know Your Rights.
          <br />
          Protect Your Future.
        </p>
      </AuraReveal>

      <AuraReveal className="relative z-10">
        <h1 className="mb-2 text-6xl font-bold uppercase leading-none tracking-tighter text-white md:text-8xl lg:text-9xl">
          Rengera
        </h1>
      </AuraReveal>

      {/* RENGERA · know your rights in minutes, not [hours/weeks/months/days] */}
      <AuraReveal
        delay={0.05}
        className="relative z-10 mb-8 flex w-full max-w-3xl flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6"
      >
        <span className="hidden h-px flex-1 bg-[#d8b485]/40 md:block" />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-2xl font-light uppercase tracking-[0.18em] text-white md:text-3xl">
          <span>Know your rights in minutes, not</span>
          <span className="relative inline-flex items-center overflow-hidden bg-[#d8b485] px-3 py-1 text-zinc-950">
            <AnimatePresence mode="wait">
              <motion.span
                key={CARD_WORDS[wordIndex]}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                {CARD_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </p>
      </AuraReveal>

      <AuraReveal delay={0.1} className="relative z-10">
        <p className="mb-12 max-w-lg text-sm font-light leading-relaxed text-zinc-300 md:text-base">
          Rwandan law translated into plain, practical guidance.
          <br className="hidden md:block" />
          Every answer cites the exact article of the exact law, so you can read it yourself.
        </p>
      </AuraReveal>

      <AuraReveal
        delay={0.15}
        className="relative z-10 mb-20 flex w-full flex-col items-center gap-6 sm:flex-row md:gap-8"
      >
        <button
          type="button"
          onClick={onStartFree}
          className="aura-lift inline-flex w-full items-center justify-center bg-[#d8b485] px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-950 hover:bg-[#c2a277] sm:w-auto"
        >
          Start Free →
        </button>
        <a
          href="#about"
          className="inline-flex w-full items-center justify-center border-b border-white/30 pb-1 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white sm:w-auto"
        >
          Who We Are
        </a>
      </AuraReveal>

      <div className="absolute right-0 top-[60%] hidden origin-right -translate-y-1/2 rotate-90 text-[10px] uppercase tracking-[0.5em] text-zinc-500 xl:block">
        Republic of Rwanda
      </div>

      <AuraReveal
        delay={0.2}
        className="absolute bottom-12 right-12 z-10 hidden h-32 w-32 items-center justify-center rounded-full border border-[#d8b485]/30 backdrop-blur-sm lg:flex"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <span className="mb-1 block text-[10px] tracking-widest text-[#d8b485]">RENGERA</span>
          <RengeraLogo size={40} label="" />
          <span className="mt-1 block text-[8px] tracking-widest text-zinc-500">EST. 2026</span>
        </div>
      </AuraReveal>
    </section>
  );
}