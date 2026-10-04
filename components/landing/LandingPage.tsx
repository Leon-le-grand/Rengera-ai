'use client';

import AuraNav from './aura/AuraNav';
import AuraHero from './aura/AuraHero';
import AuraPillars from './aura/AuraPillars';
import AuraMission from './aura/AuraMission';
import AuraApproach from './aura/AuraApproach';
import AuraInterface from './aura/AuraInterface';
import AuraCoverage from './aura/AuraCoverage';
import AuraContact from './aura/AuraContact';
import AuraFooter from './aura/AuraFooter';

interface LandingPageProps {
  onEnterApp: () => void;
  onLogin: () => void;
  onStartFree: () => void;
}

/**
 * The landing page is a direct port of the supplied reference layout: the same
 * zinc-950 canvas with its layered background, the fixed 10px uppercase
 * navigation, the oversized hero wordmark, the four-column expertise strip, the
 * mission/services split, the 3/2 coverage tiles, the 2x2 reach grid, the contact
 * block and the hairline footer. Two sections are added on top of that skeleton:
 * the "Our Approach" workflow orbit and the product interface showcase.
 */
export default function LandingPage({ onEnterApp, onLogin, onStartFree }: LandingPageProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-zinc-950 text-zinc-300 antialiased selection:bg-zinc-800 selection:text-white">
      {/* Layered canvas */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[100vh] min-h-[750px]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/95 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-[#09090b]/50" />
      </div>

      {/* Background glow */}
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] z-0 h-[50%] w-[50%] rounded-full bg-zinc-800/10 blur-[120px]" />

      <AuraNav onStartFree={onStartFree} onLogin={onLogin} />

      <main className="relative z-10 flex-grow">
        <AuraHero onStartFree={onStartFree} />
        <AuraPillars />
        <AuraMission onStartFree={onStartFree} />
        <AuraApproach onStartFree={onStartFree} />
        <AuraInterface />
        <AuraCoverage />
        <AuraContact onStartFree={onEnterApp} />
      </main>

      <AuraFooter />
    </div>
  );
}
