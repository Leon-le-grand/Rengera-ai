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
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div className="flex flex-col w-full bg-slate-50">
      <Navbar onEnterApp={onEnterApp} />
      <Hero onEnterApp={onEnterApp} />
      <Features />
      <InteractiveDemo />
      <Business />
      <Stats />
      <FAQ />
      <Footer />
    </div>
  );
}
