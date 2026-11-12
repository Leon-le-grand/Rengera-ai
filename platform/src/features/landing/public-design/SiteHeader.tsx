'use client';

import type { RefObject } from 'react';
import GlossyButton from './GlossyButton';

const NEWS = ['English · wasm_edge_mesh · French', 'Read the source behind an answer'];

interface SiteHeaderProps {
  scrolled: boolean;
  navRef: RefObject<HTMLElement | null>;
  navGlowRef: RefObject<HTMLSpanElement | null>;
  onLogin: () => void;
}

export default function SiteHeader({ scrolled, navRef, navGlowRef, onLogin }: SiteHeaderProps) {
  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="news-ticker">
        <span className="news-ticker__tag"><i aria-hidden="true" />News</span>
        <div className="news-ticker__viewport">
          <div className="news-ticker__track" aria-hidden="true">
            {[0, 1].map((copy) => NEWS.map((item, index) => (
              <span key={`${copy}-${index}`}>{item}<i aria-hidden="true">✦</i></span>
            )))}
          </div>
        </div>
        <a className="news-ticker__link" href="#urgent-help" tabIndex={scrolled ? -1 : undefined}>Urgent help <span aria-hidden="true">↗</span></a>
        <p className="sr-only">Rengera news: {NEWS.join('. ')}.</p>
      </div>

      <div className="site-header__row">
        <a className="brand" href="#top"><span className="rengera-brand-mark" aria-hidden="true" /><span>Rengera</span></a>
        <nav className="glass-nav" ref={navRef as RefObject<HTMLElement>} aria-label="Primary">
          <span className="nav-glow" ref={navGlowRef} aria-hidden="true" />
          <a href="#intelligence">Intelligence</a>
          <a href="#approach">Approach</a>
          <a href="#devices">Devices</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">About</a>
        </nav>
        <GlossyButton as="button" type="button" className="site-header__cta" onClick={onLogin}>Sign in</GlossyButton>
      </div>
    </header>
  );
}
