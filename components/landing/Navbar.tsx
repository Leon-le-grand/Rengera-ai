'use client';

import { useState } from 'react';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import RengeraLogo from '@/components/brand/RengeraLogo';

interface NavbarProps {
  onEnterApp: () => void;
  onLogin: () => void;
}

export default function Navbar({ onEnterApp, onLogin }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <header 
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
        isScrolled ? "glass py-3 border-slate-200" : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900">
          <RengeraLogo size={40} animated className="drop-shadow-md" />
          <span className="font-bold text-xl tracking-tight">Rengera</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
          <a href="#business" className="hover:text-emerald-600 transition-colors">Business</a>
          <a href="#faq" className="hover:text-emerald-600 transition-colors">FAQ</a>
          <div className="w-px h-4 bg-slate-300"></div>
          <button
            type="button"
            onClick={onLogin}
            className="rounded-lg px-2 py-2 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Login
          </button>
          <button
            type="button"
            onClick={onEnterApp}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Get Started
          </button>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl p-6 flex flex-col gap-4">
          <a href="#features" className="text-slate-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#business" className="text-slate-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Business</a>
          <a href="#faq" className="text-slate-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <div className="h-px w-full bg-slate-100 my-2"></div>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onLogin();
            }}
            className="rounded-lg text-left font-medium text-slate-600 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onEnterApp();
            }}
            className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-medium mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Get Started Free
          </button>
        </div>
      )}
    </header>
  );
}
