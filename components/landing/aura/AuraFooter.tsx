'use client';

export default function AuraFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/5 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
        <span className="font-brand text-base tracking-tighter text-zinc-400">RENGERA AI</span>

        <div className="flex items-center gap-6 text-xs text-zinc-600">
          <a href="#about" className="transition-colors hover:text-zinc-300">
            Privacy Policy
          </a>
          <a href="#services" className="transition-colors hover:text-zinc-300">
            Terms of Service
          </a>
          <span>© 2026 Rengera AI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}