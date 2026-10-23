'use client';

import { useTheme } from '@/components/app/ThemeProvider';
import RengeraLogo from '@/components/brand/RengeraLogo';
import AuraReveal from './AuraReveal';
import WeightWordmark from '@/components/brand/WeightWordmark';

/**
 * Footer, following the supplied reference: an oversized wordmark that bleeds off
 * the top of the block, a hairline divider, two link columns and an outlined
 * object study on the right.
 */

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'AI Assistant', href: '#home' },
      { label: 'Law Library', href: '#coverage' },
      { label: 'Our Approach', href: '#approach' },
      { label: 'Coverage', href: '#coverage' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '#about' },
      { label: 'Our Services', href: '#services' },
      { label: 'Contact', href: '#contact' },
      { label: 'Instagram', href: '#contact' },
      { label: 'X / Twitter', href: '#contact' },
    ],
  },
];

export default function AuraFooter() {
  const { theme } = useTheme();
  const light = theme === 'light';

  return (
    <footer className="relative z-10 mt-auto overflow-hidden border-t border-white/5 bg-black">
      {/* Oversized wordmark — the weight travels across it on hover */}
      <div className="relative select-none px-6 pt-16">
        <div className="h-[16vw] min-h-[120px] w-full">
          <WeightWordmark
            label="RENGERA"
            className={
              light
                ? '[&_.letter]:text-[13vw] [&_.letter]:font-extrabold [&_.letter]:leading-[0.9] [&_.letter]:tracking-[-0.02em] [&_.letter]:text-transparent [&_.letter]:[-webkit-text-stroke:2px_rgba(138,106,48,0.65)]'
                : '[&_.letter]:text-[13vw] [&_.letter]:font-bold [&_.letter]:leading-[0.9] [&_.letter]:tracking-[-0.02em] [&_.letter]:text-transparent [&_.letter]:[-webkit-text-stroke:1px_rgba(216,180,133,0.22)]'
            }
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1400px] border-t border-white/5 px-6">
        <div className="grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <RengeraLogo size={36} label="" />
              <span className="font-brand text-lg tracking-wide text-white">RENGERA AI</span>
            </div>
            <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-zinc-500">
              Know Your Rights. Protect Your Future.
              <br />
              © 2026 Rengera AI. Every answer cites the exact article.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {column.heading}
              </p>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[11px] font-medium uppercase tracking-widest text-white/70 transition-colors hover:text-[#d8b485]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Outlined object study — the reference's right-hand visual */}
          <div className="flex items-end justify-start lg:justify-end" aria-hidden="true">
            <svg viewBox="0 0 320 160" className="h-32 w-full max-w-sm text-white/15">
              <g fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M40 150 L58 96 H96 L114 150" />
                <path d="M120 150 L142 70 H178 L200 150" />
                <path d="M232 150 V104 a14 14 0 0 1 14 -14 h8 V62 h14 V90 h8 a14 14 0 0 1 14 14 V150" />
                <path d="M228 150 H300" />
              </g>
              <path d="M246 150 V124 a14 14 0 0 1 28 0 V150 Z" fill="#d8b485" opacity="0.25" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}