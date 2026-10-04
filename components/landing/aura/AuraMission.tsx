'use client';

import type { ElementType } from 'react';
import { ArrowRight, BarChart3, FileText, Megaphone, Share2 } from 'lucide-react';
import AuraReveal, { SectionLabel } from './AuraReveal';

const SERVICES: { icon: ElementType; title: string; description: string }[] = [
  {
    icon: FileText,
    title: 'AI Legal Guidance',
    description: 'Ask in your own words, get a cited answer',
  },
  {
    icon: BarChart3,
    title: 'Law Library',
    description: 'Every law and article, one click away',
  },
  {
    icon: Share2,
    title: 'Consultation Sharing',
    description: 'Send a read-only link to a lawyer or friend',
  },
  {
    icon: Megaphone,
    title: 'Business Compliance',
    description: 'Contract and policy checks for Rwandan teams',
  },
];

export default function AuraMission({ onStartFree }: { onStartFree: () => void }) {
  return (
    <div className="w-full">
      <section
        id="about"
        className="mx-auto flex w-full max-w-[1400px] scroll-mt-24 flex-col border-b border-white/5 lg:flex-row"
      >
        <div className="relative flex-1 border-b border-white/5 bg-[#0c0c0e] p-12 lg:border-b-0 lg:border-r lg:p-20">
          <div className="absolute inset-0 hidden bg-[url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-5 mix-blend-luminosity md:block" />
          <div className="relative z-10">
            <SectionLabel className="mb-8" size="sm">
              Our Mission
            </SectionLabel>

            <AuraReveal>
              <h2 className="mb-6 max-w-md text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
                We make Rwandan law readable.
              </h2>
            </AuraReveal>

            <AuraReveal delay={0.05}>
              <p className="mb-12 max-w-md text-sm font-light leading-relaxed text-zinc-400">
                Most legal help in Rwanda is expensive, slow, or written for judges. Rengera reads
                the published law, explains it in plain language, and shows you the clause behind
                every sentence — free, in Kinyarwanda, English or French.
              </p>
            </AuraReveal>

            <AuraReveal delay={0.1}>
              <button
                type="button"
                onClick={onStartFree}
                className="aura-lift inline-flex items-center justify-center px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-950 bg-[#d8b485] hover:bg-[#c2a277]"
              >
                About Us →
              </button>
            </AuraReveal>
          </div>
        </div>

        <div
          id="services"
          className="flex w-full scroll-mt-24 flex-col bg-[#09090b] lg:w-[50%] xl:w-[45%]"
        >
          <div className="flex-grow border-b border-white/5 p-10 lg:p-16">
            <SectionLabel className="mb-10" size="sm">
              Our Services
            </SectionLabel>

            <div className="space-y-8">
              {SERVICES.map((service, index) => (
                <AuraReveal key={service.title} delay={index * 0.05}>
                  <div className="group flex cursor-pointer items-center justify-between">
                    <div className="flex items-start gap-4">
                      <service.icon
                        className="mt-0.5 shrink-0 text-2xl text-[#d8b485]"
                        strokeWidth={1.25}
                      />
                      <div>
                        <h4 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white transition-colors group-hover:text-[#d8b485]">
                          {service.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500">{service.description}</p>
                      </div>
                    </div>
                    <ArrowRight
                      className="text-zinc-600 transition-colors group-hover:text-[#d8b485]"
                      size={18}
                      strokeWidth={1.5}
                    />
                  </div>
                </AuraReveal>
              ))}
            </div>
          </div>

          <div className="flex min-h-[150px] flex-1 flex-col lg:h-auto">
            <div className="grid flex-1 grid-cols-2">
              <div className="border-r border-white/5 bg-[url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80')] bg-cover bg-center" />
              <div className="bg-[url('https://images.unsplash.com/photo-1589578527966-fdac0f44566c?auto=format&fit=crop&q=80')] bg-cover bg-center" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}