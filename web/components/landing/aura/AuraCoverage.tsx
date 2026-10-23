'use client';

import { Building2, Gavel, Home, Users } from 'lucide-react';
import type { ElementType } from 'react';
import { useTheme } from '@/components/app/ThemeProvider';
import { cn } from '@/lib/utils';
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
  const { theme } = useTheme();
  const light = theme === 'light';
  const tile = light
    ? 'border-zinc-950/15 bg-[#f7f6f3] shadow-[0_2px_12px_-6px_rgba(24,24,27,0.25)]'
    : 'border-white/5 bg-[#0c0c0e]';
  const tileTitle = light ? 'text-zinc-950' : 'text-white';
  const tileSub = light ? 'text-zinc-600' : 'text-zinc-500';
  const heading = light ? 'text-zinc-950' : 'text-white';
  const body = light ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <div className="w-full">
      <section
        id="coverage"
        className={cn(
          'mx-auto w-full max-w-[1400px] scroll-mt-24 border-b px-6 py-20',
          light ? 'border-zinc-950/10' : 'border-white/5',
        )}
      >
        <SectionLabel className="mb-12">Our Coverage</SectionLabel>

        <AuraReveal>
          <h2 className={cn('mb-12 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl', heading)}>
            Every Rwandan law, indexed down to the article.
          </h2>
        </AuraReveal>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {AREAS.map((area, index) => (
            <AuraReveal key={area.label} delay={index * 0.06}>
              <div className={cn('flex aspect-[3/2] flex-col items-center justify-center gap-3 border px-4 text-center transition-colors', tile)}>
                <area.icon className="text-2xl text-[#8a6a30]" strokeWidth={1.5} />
                <span className={cn('text-[13px] font-extrabold uppercase tracking-widest', tileTitle)}>
                  {area.label}
                </span>
                <span className={cn('text-[11px] font-medium leading-snug', tileSub)}>{area.sub}</span>
              </div>
            </AuraReveal>
          ))}
        </div>
      </section>

      <section className={cn('mx-auto w-full max-w-[1400px] scroll-mt-24 border-b px-6 py-20', light ? 'border-zinc-950/10' : 'border-white/5')}>
        <SectionLabel className="mb-12">Where It Applies</SectionLabel>

        <div className="flex flex-col items-start gap-16 lg:flex-row">
          <div className="flex-1">
            <AuraReveal>
              <h2 className={cn('mb-6 text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl', heading)}>
                The Republic of Rwanda.
              </h2>
            </AuraReveal>
            <AuraReveal delay={0.05}>
              <p className={cn('max-w-md text-[15px] font-medium leading-relaxed', body)}>
                Our knowledge base is built from published Rwandan legislation and the official
                gazette, with regional context for the East African Community. Nothing is paraphrased
                from memory.
              </p>
            </AuraReveal>
          </div>

          <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            {REACH.map((item, index) => (
              <AuraReveal key={item.title} delay={index * 0.05}>
                <div className={cn('h-full border p-8', tile)}>
                  <h3 className={cn('mb-2 text-xl font-bold', tileTitle)}>{item.title}</h3>
                  <p className={cn('text-xs font-medium', tileSub)}>{item.note}</p>
                </div>
              </AuraReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}