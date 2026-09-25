'use client';

import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import InteractiveDemo from './InteractiveDemo';
import Business from './Business';
import Stats from './Stats';
import FAQ from './FAQ';
import Footer from './Footer';

interface LandingPageProps {
  onEnterApp: () => void;
  onLogin: () => void;
  onStartFree: () => void;
}

export default function LandingPage({ onEnterApp, onLogin, onStartFree }: LandingPageProps) {
  return (
    <div className="flex flex-col w-full bg-slate-50">
      <Navbar onEnterApp={onStartFree} onLogin={onLogin} />
      <Hero onStartFree={onStartFree} />
      <Features />
      <InteractiveDemo />
      <Business onEnterApp={onEnterApp} />
      <Stats />
      <FAQ />
      <Footer />
    </div>
  );
}
