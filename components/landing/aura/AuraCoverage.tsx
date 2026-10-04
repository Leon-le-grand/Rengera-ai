'use client';

import { Building2, Gavel, Home, Users } from 'lucide-react';
import type { ElementType } from 'react';
import AuraReveal, { SectionLabel } from './AuraReveal';

const AREAS: { label: string; sub: string; icon: ElementType }[] = [
  { label: 'Labour Law', sub: 'Contracts · Overtime · Dismissal', icon: Users },
  { label: 'Family & Inheritance', sub: 'Marriage · Divorce · Succession', icon: Gavel },
  { label: 'Land & Property', sub: 'Leases · Titles · Eviction', icon: Home },
  { label: 'Criminal Procedure', sub: 'Arrest · Bail · Rights in custody', icon: Building2 },
];

const REACH = [
  { title: 'Rwanda', note: 'Primary jurisdiction' },
  { title: 'Kigali', note: 'Fastest response' },
  { title: 'East Africa', note: 'Regional context' },
  { title: '3 Languages', note: 'Kinyarwanda · English · French' },
];

export default function AuraCoverage() {
  return (
    <div className="w-full">
      <section
        id="coverage"
        className="mx-auto w-full max-w-[1400px] scroll-mt-24 border-b border-white/5 px-6 py-20"
      >
        <SectionLabel className="mb-12">Our Coverage</SectionLabel>

        <AuraReveal>
          <h2 className="mb-12 max-w-2xl text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
            Every Rwandan law, indexed down to the article.
          </h2>
        </AuraReveal>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {AREAS.map((area, index) => (
            <AuraReveal key={area.label} delay={index * 0.06}>
              <div className="flex aspect-[3/2] flex-col items-center justify-center gap-3 border border-white/5 bg-[#0c0c0e] px-4 text-center transition-colors hover:bg-[#111114]">
                <area.icon className="text-2xl text-[#d8b485]" strokeWidth={1.25} />
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  {area.label}
                </span>
                <span className="text-[10px] leading-snug text-zinc-500">{area.sub}</span>
              </div>
            </AuraReveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] scroll-mt-24 border-b border-white/5 px-6 py-20">
        <SectionLabel className="mb-12">Where It Applies</SectionLabel>

        <div className="flex flex-col items-start gap-16 lg:flex-row">
          <div className="flex-1">
            <AuraReveal>
              <h2 className="mb-6 text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
                The Republic of Rwanda.
              </h2>
            </AuraReveal>
            <AuraReveal delay={0.05}>
              <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
                Our knowledge base is built from published Rwandan legislation and the official
                gazette, with regional context for the East African Community. Nothing is paraphrased
                from memory.
              </p>
            </AuraReveal>
          </div>

          <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            {REACH.map((item, index) => (
              <AuraReveal key={item.title} delay={index * 0.05}>
                <div className="h-full border border-white/5 bg-[#0c0c0e] p-8">
                  <h3 className="mb-2 text-lg font-medium text-white">{item.title}</h3>
                  <p className="text-[11px] text-zinc-500">{item.note}</p>
                </div>
              </AuraReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}