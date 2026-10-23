'use client';

import { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import RengeraLogo from '@/components/brand/RengeraLogo';
import { useTheme } from '@/components/app/ThemeProvider';
import { cn } from '@/lib/utils';

const LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Interface', href: '#interface' },
  { label: 'Approach', href: '#approach' },
  { label: 'Coverage', href: '#coverage' },
  { label: 'Contact', href: '#contact' },
];

export default function AuraNav({
  onStartFree,
  onLogin,
}: {
  onStartFree: () => void;
  onLogin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <header
      className={
        theme === 'light'
          ? 'fixed top-0 z-50 w-full border-b border-zinc-950/10 bg-[#e9e7e2]/90 backdrop-blur-md'
          : 'fixed top-0 z-50 w-full border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md'
      }
    >
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6">
        <a href="#home" className="flex items-center gap-3" aria-label="Rengera AI home">
          <RengeraLogo size={40} label="" />
          <span
            className={
              theme === 'light'
                ? 'font-brand text-xl tracking-wide text-zinc-950'
                : 'font-brand text-xl tracking-wide text-white'
            }
          >
            RENGERA
          </span>
        </a>

        <nav
          className={
            theme === 'light'
              ? 'hidden items-center gap-10 text-[10px] font-bold uppercase tracking-widest text-zinc-600 lg:flex'
              : 'hidden items-center gap-10 text-[10px] font-bold uppercase tracking-widest text-white/70 lg:flex'
          }
        >
          {LINKS.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'pb-1 transition-colors hover:text-[#d8b485]',
                index === 0
                  ? 'border-b border-[#d8b485] text-[#d8b485]'
                  : 'border-b border-transparent',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className={
              theme === 'light'
                ? 'mr-3 hidden h-9 w-9 items-center justify-center border border-zinc-950/15 text-zinc-600 transition-colors hover:border-[#8a6a30] hover:text-[#8a6a30] md:inline-flex'
                : 'mr-3 hidden h-9 w-9 items-center justify-center border border-white/15 text-zinc-300 transition-colors hover:border-[#d8b485] hover:text-[#d8b485] md:inline-flex'
            }
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="hidden items-center justify-center px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-950 transition-colors bg-[#d8b485] hover:bg-[#c2a277] md:inline-flex"
          >
            Log In →
          </button>
          <button
            type="button"
            onClick={onStartFree}
            className={
              theme === 'light'
                ? 'ml-3 hidden items-center justify-center border border-zinc-950/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:border-zinc-950/50 md:inline-flex'
                : 'ml-3 hidden items-center justify-center border border-white/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white/50 md:inline-flex'
            }
          >
            Let's Connect →
          </button>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className={
              theme === 'light'
                ? 'ml-4 text-zinc-600 transition-colors hover:text-zinc-950 lg:hidden'
                : 'ml-4 text-zinc-400 transition-colors hover:text-white lg:hidden'
            }
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className={
            theme === 'light'
              ? 'border-t border-zinc-950/10 bg-[#e9e7e2] px-6 py-6 lg:hidden'
              : 'border-t border-white/5 bg-[#09090b] px-6 py-6 lg:hidden'
          }
        >
          <nav
            className={
              theme === 'light'
                ? 'flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-zinc-600'
                : 'flex flex-col gap-4 text-[11px] font-bold uppercase tracking-widest text-white/70'
            }
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="transition-colors hover:text-[#d8b485]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogin();
              }}
              className="w-full px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-950 bg-[#d8b485]"
            >
              Log In →
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onStartFree();
              }}
              className={
                theme === 'light'
                  ? 'w-full border border-zinc-950/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-950'
                  : 'w-full border border-white/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white'
              }
            >
              Let's Connect →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}