'use client';

import type { ElementType } from 'react';
import { BadgeCheck, Flag, Languages, Scale } from 'lucide-react';
import AuraReveal from './AuraReveal';

const PILLARS: { icon: ElementType; title: string; lines: [string, string] }[] = [
  {
    icon: Scale,
    title: 'Article-Level Citations',
    lines: ['Every answer points to the', 'exact article of the exact law'],
  },
  {
    icon: Languages,
    title: 'Plain Language',
    lines: ['Legal text rewritten into', 'steps you can actually take'],
  },
  {
    icon: BadgeCheck,
    title: 'Official Sources Only',
    lines: ['Published Rwandan law,', 'never invented clauses'],
  },
  {
    icon: Flag,
    title: 'Built For Rwanda',
    lines: ['Labour, family, land and', 'criminal procedure locally'],
  },
];

export default function AuraPillars() {
  return (
    <div className="w-full border-y border-white/5 bg-[#09090b]/80 py-8 backdrop-blur-md">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 md:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar, index) => (
          <AuraReveal key={pillar.title} delay={index * 0.06} className="flex items-start gap-4">
            <pillar.icon className="mt-0.5 shrink-0 text-3xl text-[#d8b485]" strokeWidth={1.25} />
            <div>
              <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white">
                {pillar.title}
              </h4>
              <p className="text-[11px] leading-snug text-zinc-400">
                {pillar.lines[0]}
                <br />
                {pillar.lines[1]}
              </p>
            </div>
          </AuraReveal>
        ))}
      </div>
    </div>
  );
}