'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';
import Reveal, { RevealGroup, RevealItem } from '@/components/brand/Reveal';

interface Plan {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Citizen',
    price: 'Free',
    cadence: 'forever',
    description: 'Everything you need to understand your rights in Rwanda.',
    features: [
      'Unlimited legal questions',
      'Answers cite the exact article',
      'Read any law in the library',
      'Emergency routing to official services',
    ],
    cta: 'Start free',
  },
  {
    name: 'Business',
    price: 'RWF 25,000',
    cadence: 'per month',
    description: 'For small companies that need every rule in one place.',
    features: [
      'Everything in Citizen',
      'Employment and contract templates',
      'Compliance checklist per sector',
      'Priority question queue',
    ],
    cta: 'Start business plan',
    highlighted: true,
  },
  {
    name: 'Institution',
    price: 'Custom',
    cadence: 'per year',
    description: 'For organisations teaching or delivering legal services.',
    features: [
      'Everything in Business',
      'Bulk staff accounts',
      'Curated law collections',
      'Dedicated onboarding',
    ],
    cta: 'Talk to us',
  },
];

export default function Pricing() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700">
            <Sparkles size={15} strokeWidth={2.5} />
            Simple, honest pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Free for every citizen
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Legal knowledge should not be a paywall. Pay only if you need it for work.
          </p>
        </Reveal>

        <RevealGroup
          className="mt-16 grid gap-6 lg:grid-cols-3"
          stagger={0.1}
        >
          {PLANS.map((plan) => (
            <RevealItem key={plan.name} className="h-full">
              <motion.div
                whileHover={reducedMotion ? undefined : { y: -6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className={`relative flex h-full flex-col rounded-[1.35rem] border p-7 shadow-sm transition-shadow duration-300 ${
                  plan.highlighted
                    ? 'border-emerald-300 bg-slate-950 text-white shadow-2xl shadow-emerald-900/20'
                    : 'border-slate-200 bg-white hover:shadow-xl'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    Most popular
                  </span>
                )}

                <h3
                  className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}
                >
                  {plan.name}
                </h3>

                <p
                  className={`mt-1 text-sm leading-6 ${plan.highlighted ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold tracking-tight ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${plan.highlighted ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    {plan.cadence}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          plan.highlighted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className={plan.highlighted ? 'text-slate-200' : 'text-slate-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                    plan.highlighted
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg'
                      : 'bg-slate-900 text-white hover:-translate-y-px hover:bg-slate-800 hover:shadow-lg'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}