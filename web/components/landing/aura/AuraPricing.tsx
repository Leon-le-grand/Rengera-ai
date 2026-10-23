'use client';

import { Check } from 'lucide-react';
import AuraReveal, { SectionLabel } from './AuraReveal';
import { cn } from '@/lib/utils';

/**
 * Pricing, built from the template's grammar: hairline borders, uppercase
 * micro-labels, no rounded corners anywhere, one gold panel to mark the plan we
 * want people on.
 */

const PLANS = [
  {
    name: 'Citizen',
    price: 'Free',
    cadence: 'forever',
    note: 'For anyone who needs to know their rights today.',
    features: [
      'Unlimited legal questions',
      'Answers in Kinyarwanda, English & French',
      'Exact article citation on every answer',
      'Deadline reminders',
      'Share an answer with a lawyer',
    ],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Business',
    price: 'RWF 49,000',
    cadence: 'per month',
    note: 'For Rwandan SMEs that sign contracts every week.',
    features: [
      'Everything in Citizen',
      'Contract review — up to 20 documents a month',
      'Compliance report export',
      'Law-change alerts for the laws you rely on',
      'Team seats for your staff',
    ],
    cta: 'Start business plan',
    featured: true,
  },
  {
    name: 'Institution',
    price: 'Custom',
    cadence: 'per year',
    note: 'For legal aid organisations, TVETs and district offices.',
    features: [
      'Everything in Business',
      'Bulk accounts and shared question history',
      'Branded answer cards for your organisation',
      'Human-review queue for your published guidance',
      'Priority ingestion of new laws',
    ],
    cta: "Let's talk",
    featured: false,
  },
];

export default function AuraPricing({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section
      id="pricing"
      className="mx-auto w-full max-w-[1400px] scroll-mt-24 border-b border-white/5 px-6 py-20"
    >
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionLabel className="mb-8">Pricing</SectionLabel>
          <AuraReveal>
            <h2 className="max-w-2xl text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Free for citizens. Priced for companies.
            </h2>
          </AuraReveal>
        </div>
        <AuraReveal delay={0.05}>
          <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
            No paywall on your rights. We charge companies that need contracts checked and compliance
            tracked, not citizens who need to know what the law says.
          </p>
        </AuraReveal>
      </div>

      <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 lg:grid-cols-3">
        {PLANS.map((plan, index) => (
          <AuraReveal key={plan.name} delay={index * 0.06}>
            <div
              className={cn(
                'flex h-full flex-col justify-between gap-8 p-8 transition-colors duration-500',
                plan.featured ? 'bg-[#d8b485] text-zinc-950' : 'bg-[#09090b] text-white hover:bg-[#0c0c0e]',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className={cn(
                      'text-[11px] font-bold uppercase tracking-[0.2em]',
                      plan.featured ? 'text-zinc-950' : 'text-[#d8b485]',
                    )}
                  >
                    {plan.name}
                  </h3>
                  {plan.featured && (
                    <span className="border border-zinc-950/30 px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
                      Most chosen
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-3xl font-medium tracking-tight md:text-4xl">{plan.price}</span>
                  <span
                    className={cn(
                      'text-[11px] uppercase tracking-widest',
                      plan.featured ? 'text-zinc-800' : 'text-zinc-500',
                    )}
                  >
                    {plan.cadence}
                  </span>
                </div>

                <p
                  className={cn(
                    'mt-4 text-sm leading-6',
                    plan.featured ? 'text-zinc-800' : 'text-zinc-400',
                  )}
                >
                  {plan.note}
                </p>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        size={14}
                        strokeWidth={3}
                        className={cn('mt-1 shrink-0', plan.featured ? 'text-zinc-950' : 'text-[#d8b485]')}
                      />
                      <span className={cn('text-sm', plan.featured ? 'text-zinc-900' : 'text-zinc-300')}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={onStartFree}
                className={cn(
                  'aura-lift inline-flex w-full items-center justify-center px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors',
                  plan.featured
                    ? 'bg-zinc-950 text-white hover:bg-zinc-900'
                    : 'border border-white/15 text-white hover:border-[#d8b485] hover:text-[#d8b485]',
                )}
              >
                {plan.cta} →
              </button>
            </div>
          </AuraReveal>
        ))}
      </div>
    </section>
  );
}