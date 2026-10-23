'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';

/**
 * WhatsApp is the distribution channel in Rwanda, so the share card is offered
 * first and the platform share sheet second.
 */
export default function ShareActions({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window === 'undefined' ? '' : window.location.href;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address bar still has the link.
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${url}`)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
      >
        <MessageCircle size={16} strokeWidth={2.25} />
        Share on WhatsApp
      </a>

      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-px hover:border-emerald-300 hover:text-emerald-700"
      >
        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} strokeWidth={2.25} />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>

      <button
        type="button"
        onClick={() => navigator.share?.({ title, url: window.location.href })}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-px hover:border-emerald-300 hover:text-emerald-700"
      >
        <Share2 size={16} strokeWidth={2.25} />
        More
      </button>
    </div>
  );
}