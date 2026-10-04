'use client';

import { Globe, Smartphone } from 'lucide-react';
import WeightHover from '@/components/brand/WeightHover';

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
    <footer className="overflow-hidden border-t border-slate-800 bg-[#050505] pt-24 text-white">
      {/* Giant Brand Text with mask — inspired by the animated-brand-footer template */}
      <div
        className="mb-20 w-full text-center"
        style={{
          maskImage: 'linear-gradient(180deg, transparent, black 0%, black 55%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 0%, black 55%, transparent)',
        }}
      >
        <WeightHover
          label="RENGERA"
          fromWeight={400}
          toWeight={900}
          fontSize={180}
          color="#141414"
          className="justify-center"
        />
      </div>

      {/* Links Grid */}
      <div className="mx-auto max-w-7xl border-t border-slate-800 px-6">
        <div className="grid grid-cols-1 gap-12 py-16 lg:grid-cols-2">
          {/* Left: Navigation + App info */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col gap-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Platform
                </h3>
                {PLATFORM_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-xs font-medium uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="flex flex-col gap-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Company
                </h3>
                {COMPANY_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-xs font-medium uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <PlayStoreBadge />
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
                <Globe size={18} strokeWidth={2.25} className="shrink-0 text-emerald-300" />
                <span className="text-sm font-semibold text-emerald-100">
                  No install needed — use it in your browser
                </span>
              </div>
            </div>
          </div>

          {/* Right: Wireframe illustration inspired by the template */}
          <div className="flex items-center justify-center border-t border-slate-800 pt-12 lg:border-t-0 lg:pt-0">
            <svg
              viewBox="0 0 400 120"
              className="max-h-[160px] w-full opacity-20"
              preserveAspectRatio="xMidYMid meet"
              strokeWidth="2"
            >
              {/* Pillar 1 */}
              <path d="M40 100 L50 30 L90 30 L100 100" stroke="white" strokeWidth="1" fill="none" />
              <rect x="50" y="20" width="40" height="10" stroke="white" strokeWidth="1" fill="none" />

              {/* Pillar 2 */}
              <path d="M120 100 L130 10 L170 10 L180 100" stroke="white" strokeWidth="1" fill="none" />
              <rect x="130" y="5" width="40" height="5" stroke="white" strokeWidth="1" fill="none" />

              {/* Gate / Portico */}
              <g transform="translate(200, 10)">
                <path d="M15 25 Q15 20 20 20 L40 20 Q45 20 45 25 L45 80 Q45 90 30 90 Q15 90 15 80 Z" stroke="white" strokeWidth="1" fill="none" />
                <path d="M25 0 L25 10 L20 10 L20 20 L40 20 L40 10 L35 10 L35 0 Z" stroke="white" strokeWidth="1" fill="none" />
                <rect x="15" y="60" width="30" height="30" fill="#b69d74" opacity="0.3" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
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
