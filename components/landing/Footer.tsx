'use client';

import { Globe, Smartphone } from 'lucide-react';
import VectorWordmark from '@/components/brand/VectorWordmark';

const PLATFORM_LINKS = [
  { label: 'AI Assistant', href: '#features' },
  { label: 'Browse Laws', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Interactive Demo', href: '#interactive-demo' },
];

const COMPANY_LINKS = [
  { label: 'About Us', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

/**
 * The Play Store URL is a placeholder until the app is published. Point
 * PLAY_STORE_URL at the real listing and both the footer badge and this link
 * start working without a code change.
 */
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || '#';

function PlayStoreBadge() {
  return (
    <a
      href={PLAY_STORE_URL}
      target={PLAY_STORE_URL === '#' ? undefined : '_blank'}
      rel={PLAY_STORE_URL === '#' ? undefined : 'noopener noreferrer'}
      aria-label="Get Rengera AI on Google Play"
      className="group inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/10 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <Smartphone size={20} strokeWidth={2.25} className="shrink-0 text-emerald-400" />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">Get it on</span>
        <span className="text-sm font-bold text-white">Google Play</span>
      </span>
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            {/* No logo here on purpose: the animated wordmark above it is the
                brand mark, and stacking two marks read as clutter. */}
            <h2 className="sr-only">Rengera AI</h2>
            <p className="max-w-sm leading-relaxed text-slate-400">
              Empowering Rwandan citizens through accessible, AI-driven legal education. Know your
              rights, protect your future.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PlayStoreBadge />

              <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
                <Globe size={18} strokeWidth={2.25} className="shrink-0 text-emerald-300" />
                <span className="text-sm font-semibold text-emerald-100">
                  No install needed — use it in your browser
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-semibold text-white">Platform</h3>
            <ul className="space-y-3.5 text-sm text-slate-400">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-emerald-400">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-semibold text-white">Company</h3>
            <ul className="space-y-3.5 text-sm text-slate-400">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-emerald-400">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The animated wordmark sits on its own band so it reads as a
            signature rather than competing with the links. */}
        <div className="mt-14 h-24 w-full overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40">
          <VectorWordmark
            text="RENGERA AI"
            background="transparent"
            textColor="#e2e8f0"
            shade="#334155"
            accent="#b69d74"
            handles={{ size: 86, spread: 27, labels: false }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} RENGERA AI. All rights reserved. Made in Kigali.
          </p>
          <p className="text-sm text-slate-500">
            Legal education, not legal advice. Verify important decisions with an official source.
          </p>
        </div>
      </div>
    </footer>
  );
}
