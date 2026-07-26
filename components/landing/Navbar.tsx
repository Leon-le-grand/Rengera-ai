'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { Scale, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar({ onEnterApp }: { onEnterApp: () => void }) {
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
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Scale size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight">Rengera</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
          <a href="#business" className="hover:text-emerald-600 transition-colors">Business</a>
          <a href="#faq" className="hover:text-emerald-600 transition-colors">FAQ</a>
          <div className="w-px h-4 bg-slate-300"></div>
          <button className="hover:text-slate-900 transition-colors">Login</button>
          <button 
            onClick={onEnterApp}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
          >
            Get Started
          </button>
        </nav>

        <button 
          className="md:hidden text-slate-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl p-6 flex flex-col gap-4">
          <a href="#features" className="text-slate-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#business" className="text-slate-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Business</a>
          <a href="#faq" className="text-slate-600 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <div className="h-px w-full bg-slate-100 my-2"></div>
          <button className="text-left font-medium text-slate-600 py-2">Login</button>
          <button 
            onClick={onEnterApp}
            className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-medium mt-2"
          >
            Get Started Free
          </button>
        </div>
      )}
    </header>
  );
}
