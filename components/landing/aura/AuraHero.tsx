'use client';

import RengeraLogo from '@/components/brand/RengeraLogo';
import AuraReveal from './AuraReveal';

export default function AuraHero({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section
      id="home"
      className="relative mx-auto flex w-full max-w-[1400px] scroll-mt-24 flex-col items-start px-6 pb-24 pt-40 text-left"
    >
      <AuraReveal className="mb-6 flex items-center gap-4">
        <div className="h-px w-12 bg-[#d8b485]" />
        <p className="text-[10px] font-bold uppercase leading-relaxed tracking-[0.2em] text-[#d8b485]">
          Know Your Rights.
          <br />
          Protect Your Future.
        </p>
      </AuraReveal>

      <AuraReveal>
        <h1 className="mb-2 text-6xl font-bold uppercase leading-none tracking-tighter text-white md:text-8xl lg:text-9xl">
          Rengera
        </h1>
      </AuraReveal>

      <AuraReveal
        delay={0.05}
        className="mb-8 flex w-full max-w-2xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6"
      >
        <h2 className="whitespace-nowrap text-2xl font-light uppercase tracking-[0.3em] text-white md:text-4xl">
          AI Legal Assistant
        </h2>
        <div className="hidden h-px flex-grow bg-[#d8b485]/50 sm:block" />
      </AuraReveal>

      <AuraReveal delay={0.1}>
        <p className="mb-12 max-w-lg text-sm font-light leading-relaxed text-zinc-300 md:text-base">
          Rwandan law translated into plain, practical guidance.
          <br className="hidden md:block" />
          Every answer cites the exact article of the exact law, so you can read it yourself.
        </p>
      </AuraReveal>

      <AuraReveal
        delay={0.15}
        className="mb-20 flex w-full flex-col items-center gap-6 sm:flex-row md:gap-8"
      >
        <button
          type="button"
          onClick={onStartFree}
          className="aura-lift inline-flex w-full items-center justify-center px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-950 bg-[#d8b485] hover:bg-[#c2a277] sm:w-auto"
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
        className="absolute bottom-12 right-12 hidden h-32 w-32 items-center justify-center rounded-full border border-[#d8b485]/30 backdrop-blur-sm lg:flex"
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