'use client';

import { useState } from 'react';
import { Mail, MapPin } from 'lucide-react';
import AuraReveal from './AuraReveal';
import GhostWord, { GhostLabel } from './GhostWord';

export default function AuraContact({ onStartFree }: { onStartFree: () => void }) {
  const [sent, setSent] = useState(false);

  return (
    <section
      id="contact"
      className="relative mx-auto w-full max-w-[1400px] scroll-mt-24 overflow-hidden px-6 py-20"
    >
      <GhostWord word="CONNECT" className="right-[-6%] top-8" />

      <div className="relative flex flex-col gap-16 lg:flex-row">
        <div className="relative flex-1">
          <GhostLabel className="mb-8">Let's Connect</GhostLabel>

          <AuraReveal>
            <h2 className="mb-6 max-w-md text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Ready to know your rights?
            </h2>
          </AuraReveal>

          <AuraReveal delay={0.05}>
            <p className="mb-12 max-w-md text-sm font-light leading-relaxed text-zinc-400">
              Ask Rengera directly, or reach out to the team about partnerships, legal aid
              programmes or bulk access for your organisation.
            </p>
          </AuraReveal>

          <div className="space-y-8">
            <AuraReveal delay={0.1}>
              <div className="flex items-start gap-4">
                <Mail className="mt-1 shrink-0 text-2xl text-[#d8b485]" strokeWidth={1.25} />
                <div>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white">
                    Email
                  </h4>
                  <a
                    href="mailto:hello@rengera.ai"
                    className="text-sm text-zinc-400 transition-colors hover:text-[#d8b485]"
                  >
                    hello@rengera.ai
                  </a>
                </div>
              </div>
            </AuraReveal>

            <AuraReveal delay={0.15}>
              <div className="flex items-start gap-4">
                <MapPin className="mt-1 shrink-0 text-2xl text-[#d8b485]" strokeWidth={1.25} />
                <div>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white">
                    Location
                  </h4>
                  <p className="text-sm text-zinc-400">Kigali, Rwanda</p>
                </div>
              </div>
            </AuraReveal>
          </div>
        </div>

        <AuraReveal delay={0.1} className="w-full flex-1 lg:max-w-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
            className="space-y-8 border border-white/5 bg-[#0c0c0e] p-8 md:p-12"
          >
            <div>
              <label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-white">
                Name
              </label>
              <input
                type="text"
                className="w-full border-b border-white/10 bg-transparent pb-4 text-sm text-white transition-colors outline-none placeholder:text-zinc-700 focus:border-[#d8b485]"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-white">
                Email
              </label>
              <input
                type="email"
                className="w-full border-b border-white/10 bg-transparent pb-4 text-sm text-white transition-colors outline-none placeholder:text-zinc-700 focus:border-[#d8b485]"
                placeholder="Your email address"
              />
            </div>

            <div>
              <label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-white">
                Message
              </label>
              <textarea
                className="h-24 w-full resize-none border-b border-white/10 bg-transparent pb-4 text-sm text-white transition-colors outline-none placeholder:text-zinc-700 focus:border-[#d8b485]"
                placeholder="How can we help?"
              />
            </div>

            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-950 transition-all bg-[#d8b485] hover:bg-[#c2a277]"
            >
              {sent ? 'Message Sent →' : 'Send Message →'}
            </button>

            <button
              type="button"
              onClick={onStartFree}
              className="w-full border border-white/10 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white/30"
            >
              Or Ask Rengera Now →
            </button>
          </form>
        </AuraReveal>
      </div>
    </section>
  );
}