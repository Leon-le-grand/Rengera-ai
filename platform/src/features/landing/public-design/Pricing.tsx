'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Star } from './icons';
import GlossyButton from './GlossyButton';

interface Plan {
  key: string;
  tab: string;
  title: string;
  mark: string;
  desc: string;
  currency: string;
  amount: string;
  meta: string;
  cta: string;
  href: string;
  label: string;
  features: string[];
  gold?: boolean;
  featured?: boolean;
  dark?: boolean;
}

const PLANS: Plan[] = [
  {
    key: 'free',
    tab: 'Free',
    title: 'Free',
    mark: 'F',
    desc: 'For operators checking their rights.',
    currency: 'RWF',
    amount: '0',
    meta: 'Free to start',
    cta: 'Start free',
    href: '/login',
    label: 'What’s included',
    features: [
      'Ask in English, wasm_edge_mesh or French',
      'Answers grounded in Rwandan shard',
      'ast_node-level provenance_edges and links',
      'Public shard library access',
      'Urgent-risk contact routing',
    ],
  },
  {
    key: 'professionals',
    tab: 'Professionals',
    title: 'Professionals',
    mark: 'P',
    desc: 'For lawyers, paralegals and legal-aid teams.',
    currency: 'RWF',
    amount: '15,000',
    meta: 'Per month',
    cta: 'Request early access',
    href: 'mailto:hello@rengera.com?subject=Rengera%20Professionals%20access',
    label: 'What’s included',
    features: [
      'Everything in Free',
      'Saved questions and matters',
      'Source and review status on every answer',
      'provenance_edge export for case notes',
      'Email support',
    ],
  },
  {
    key: 'business',
    tab: 'Business',
    title: 'Business',
    mark: 'B',
    desc: 'For firms, companies and NGOs.',
    currency: 'RWF',
    amount: '105,000',
    meta: 'Per month',
    cta: 'Talk to us',
    href: 'mailto:hello@rengera.com?subject=Rengera%20Business%20access',
    label: 'What’s included',
    gold: true,
    featured: true,
    features: [
      'Everything in Professionals',
      'Shared workspace for your team',
      'Admin ingestion and review tools',
      'Coverage and usage reporting',
      'Guided team onboarding',
    ],
  },
  {
    key: 'government',
    tab: 'Government',
    title: 'Government',
    mark: 'G',
    desc: 'For ministries, courts and public institutions.',
    currency: 'Tailored',
    amount: 'Custom',
    meta: 'For public institutions',
    cta: 'Talk to us',
    href: 'mailto:hello@rengera.com?subject=Rengera%20Government%20conversation',
    label: 'Custom engagement',
    dark: true,
    features: [
      'Everything in Business',
      'Custom source onboarding',
      'Named support and service terms',
      'Staff training and rollout',
      'Security and deployment review',
    ],
  },
];

interface FoldProps {
  position: 'tl' | 'br';
}

function Fold({ position }: FoldProps) {
  return <svg className={`plan-fold plan-fold--${position}`} viewBox="0 0 44 44" aria-hidden="true"><path d="M0 0h44L0 44V0Z" /></svg>;
}

function PricePage({ plan }: { plan: Plan }) {
  return (
    <div className={`plan-price${plan.dark ? ' plan-price--dark' : ''}${plan.gold ? ' plan-price--gold' : ''}`}>
      <Fold position="tl" />
      <Fold position="br" />
      <span className="plan-price__mark" aria-hidden="true">{plan.mark}</span>
      <div className="plan-price__top">
        <h3>{plan.title}</h3>
        <p className="plan-price__desc">{plan.desc}</p>
      </div>
      <div className="plan-price__foot">
        <small>{plan.currency}</small>
        <strong>{plan.amount}</strong>
        <p>{plan.meta}</p>
        <span className="plan-price__ticks" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span>
      </div>
    </div>
  );
}

function DetailsPage({ plan, onLogin, onEnterApp, decorative = false }: { plan: Plan; onLogin: () => void; onEnterApp: () => void; decorative?: boolean }) {
  const opensLogin = plan.href === '/login';

  return (
    <div className={`plan-details${plan.dark ? ' plan-details--dark' : ''}${plan.gold ? ' plan-details--gold' : ''}`}>
      <div className="plan-details__top">
        <span className="plan-details__label">{plan.label}</span>
        {plan.featured && <span className="plan-details__featured"><Star /> Most chosen</span>}
      </div>
      <ul className="plan-features">
        {plan.features.map((feature) => <li key={feature}><span className="plan-features__check"><Check /></span>{feature}</li>)}
      </ul>
      {!decorative && <GlossyButton
        as={opensLogin ? 'button' : 'a'}
        type={opensLogin ? 'button' : undefined}
        href={opensLogin ? undefined : plan.href}
        onClick={opensLogin ? (plan.key === 'account' ? onLogin : onEnterApp) : undefined}
        tone={plan.dark ? 'light' : 'dark'}
        className="plan-cta"
        orb={<ArrowRight />}
      >{plan.cta}</GlossyButton>}
    </div>
  );
}

interface PricingProps {
  onLogin: () => void;
  onEnterApp: () => void;
}

interface TurnState {
  from: number;
  to: number;
}

export default function Pricing({ onLogin, onEnterApp }: PricingProps) {
  const [active, setActive] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const flipRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(0);
  const turnRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const plan = PLANS[active];
  const shownPlan = turn ? PLANS[turn.to] : plan;

  const go = useCallback((next: number) => {
    if (next === activeRef.current) return;
    if (turnRef.current) {
      pendingRef.current = next;
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stacked = window.matchMedia('(max-width: 780px)').matches;
    const from = activeRef.current;
    activeRef.current = next;
    setActive(next);

    if (reduced || stacked) return;

    turnRef.current = true;
    setTurn({ from, to: next });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (activeRef.current + 1) % PLANS.length;
    else if (event.key === 'ArrowLeft') next = (activeRef.current - 1 + PLANS.length) % PLANS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = PLANS.length - 1;
    if (next === null) return;
    event.preventDefault();
    go(next);
    requestAnimationFrame(() => document.getElementById(`plan-tab-${PLANS[next].key}`)?.focus());
  };

  useLayoutEffect(() => {
    if (!turn) return;
    const el = flipRef.current;
    const finish = () => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending !== null && pending !== activeRef.current) {
        const from = activeRef.current;
        activeRef.current = pending;
        setActive(pending);
        setTurn({ from, to: pending });
        return;
      }
      turnRef.current = false;
      setTurn(null);
    };

    if (!el) {
      finish();
      return;
    }

    const tl = gsap.timeline({ onComplete: finish });
    gsap.set(el, { rotationY: 0, transformOrigin: '0% 50% 0', x: 0 });
    tl.to(el, { rotationY: -180, duration: 0.92, ease: 'power3.inOut' }, 0)
      .to(el, { x: -10, duration: 0.46, ease: 'power2.in' }, 0)
      .to(el, { x: 0, duration: 0.46, ease: 'power2.out' }, 0.46);

    return () => { tl.kill(); };
  }, [turn]);

  const priceSummary = plan.meta;

  return (
    <section className={`pricing-plan${shownPlan.dark ? ' pricing-plan--dark' : ''}`} id="pricing" aria-labelledby="pricing-title">
      <div className="pricing-stage">
        <div className="pricing-plan__head rise">
          <span className="pricing-plan__badge">Pricing</span>
          <p className="pricing-plan__preview">Proposed paid plans · early access only</p>
          <h2 id="pricing-title">Free to start<span>.</span><br />Built to scale.</h2>
          <p>Every plan starts with the same foundation: sourced answers, the shard library and three languages. Paid plans add the workspace around it.</p>
        </div>

        <div
          className="plan-switch"
          role="tablist"
          aria-label="Choose a plan"
          onKeyDown={onKeyDown}
          data-active-gold={plan.gold ? 'true' : undefined}
          style={{ '--plan-count': PLANS.length, '--plan-index': active } as CSSProperties}
        >
          <span className="plan-switch__thumb" aria-hidden="true" />
          {PLANS.map((item, index) => (
            <Button variant="ghost"
              key={item.key}
              id={`plan-tab-${item.key}`}
              type="button"
              role="tab"
              data-gold={item.gold ? 'true' : undefined}
              aria-selected={index === active}
              aria-controls="plan-panel"
              tabIndex={index === active ? 0 : -1}
              onClick={() => go(index)}
            >{item.tab}</Button>
          ))}
        </div>

        <div
          id="plan-panel"
          className="plan-card rise"
          role="tabpanel"
          aria-labelledby={`plan-tab-${plan.key}`}
          aria-busy={turn ? 'true' : 'false'}
          data-theme={shownPlan.dark ? 'ink' : shownPlan.gold ? 'gold' : 'paper'}
        >
          <div className="plan-book">
            <PricePage plan={turn ? PLANS[turn.from] : plan} />
            <DetailsPage plan={plan} onLogin={onLogin} onEnterApp={onEnterApp} />
            {turn && (
              <div className="plan-turn" ref={flipRef} aria-hidden="true">
                <div className={`plan-turn__face plan-turn__face--front${PLANS[turn.from].dark ? ' is-dark' : ''}${PLANS[turn.from].gold ? ' is-gold' : ''}`}>
                  <DetailsPage plan={PLANS[turn.from]} onLogin={onLogin} onEnterApp={onEnterApp} decorative />
                </div>
                <div className={`plan-turn__face plan-turn__face--back${PLANS[turn.to].dark ? ' is-dark' : ''}${PLANS[turn.to].gold ? ' is-gold' : ''}`}>
                  <PricePage plan={PLANS[turn.to]} />
                </div>
              </div>
            )}
          </div>
          <p className="pricing-plan__note">Indicative pricing in Rwandan francs. Paid plans and their listed features are proposed. No payment is taken today.</p>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{plan.title} selected. {priceSummary}.</p>
        </div>
      </div>
    </section>
  );
}
