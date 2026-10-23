'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ChevronRight, MessageSquareText, ShieldCheck } from 'lucide-react';
import RengeraLogo from '@/components/brand/RengeraLogo';
import LoginScreen from '@/components/app/LoginScreen';
import { cn } from '@/lib/utils';

/**
 * Mobile entry: Capacitor/phone users boot into 3 onboarding slides (once,
 * remembered in localStorage), then the existing login screen. The desktop
 * landing page stays untouched — this component is rendered only when the
 * app detects it is running inside the Android WebView.
 */

const STORAGE_KEY = 'rengera_onboarded_v1';

const SLIDES = [
  {
    icon: MessageSquareText,
    title: 'Ask the law',
    body: 'Describe your problem in plain language. Rengera answers with the exact article, in Kinyarwanda, English or French.',
  },
  {
    icon: BookOpen,
    title: 'Read the official text',
    body: 'Every answer cites the law and article it came from. The full library of Rwandan laws is one tap away.',
  },
  {
    icon: ShieldCheck,
    title: 'Stay safe',
    body: 'Emergencies route you straight to the right authority. Nothing is binding advice — the official sources always come first.',
  },
];

interface LoginUser {
  name: string;
  email: string;
  role: 'admin';
}

interface AccountUser {
  id: string | null;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
}

interface MobileEntryProps {
  onLogin: (user: LoginUser) => void;
  onAccount: (account: AccountUser) => void;
}

export default function MobileEntry({ onLogin, onAccount }: MobileEntryProps) {
  const [step, setStep] = useState<'deciding' | 'onboarding' | 'login'>('deciding');

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      seen = false;
    }
    setStep(seen ? 'login' : 'onboarding');
  }, []);

  const finish = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Non-fatal: onboarding just repeats next launch.
    }
    setStep('login');
  };

  if (step === 'deciding') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#09090b]">
        <RengeraLogo size={64} label="" />
      </main>
    );
  }

  if (step === 'login') {
    return (
      <LoginScreen
        onLogin={onLogin}
        onAccount={onAccount}
        // Mobile has no marketing page to go back to; exit re-shows onboarding.
        onExit={() => setStep('onboarding')}
      />
    );
  }

  const [active, setActive] = useState(0);
  const slide = SLIDES[active];
  const last = active === SLIDES.length - 1;

  return (
    <main className="flex min-h-dvh flex-col bg-[#09090b] text-white">
      <div className="flex items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-3">
          <RengeraLogo size={34} label="" />
          <span className="font-brand text-lg tracking-wide">RENGERA AI</span>
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full max-w-xs flex-col items-center"
        >
          <span className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#d8b485]/40 bg-[#d8b485]/10 text-[#d8b485]">
            <slide.icon size={34} strokeWidth={1.75} />
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{slide.title}</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">{slide.body}</p>
        </motion.div>

        <div className="mt-12 flex items-center gap-2">
          {SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Slide ${index + 1}`}
              onClick={() => setActive(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === active ? 'w-8 bg-[#d8b485]' : 'w-2 bg-zinc-700 hover:bg-zinc-500',
              )}
            />
          ))}
        </div>
      </div>

      <div className="px-8 pb-10">
        <button
          type="button"
          onClick={() => (last ? finish() : setActive((current) => current + 1))}
          className="flex w-full items-center justify-center gap-2 bg-[#d8b485] py-4 text-[11px] font-extrabold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-[#c2a277]"
        >
          {last ? 'Get started' : 'Next'}
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </main>
  );
}
