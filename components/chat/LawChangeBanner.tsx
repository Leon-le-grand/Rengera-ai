'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { getLawChangeAlerts, type LawChangeAlert } from '@/app/product-actions';

const DISMISSED_KEY = 'rengera_law_alerts_dismissed_v1';

/**
 * Tells a citizen when the law they relied on has moved. Nobody in Rwanda
 * publishes this, and it is the single cheapest way to make the product
 * something a user must open rather than something they read once.
 */
export default function LawChangeBanner() {
  const [alerts, setAlerts] = useState<LawChangeAlert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDismissed(JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || '[]'));
    } catch {
      setDismissed([]);
    }

    (async () => {
      try {
        const result = await getLawChangeAlerts(3);
        if (result.success) setAlerts(result.alerts);
      } catch {
        // Alerts are a bonus; the chat must never wait on them.
      }
    })();
  }, []);

  const visible = alerts.filter((alert) => !dismissed.includes(alert.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal.
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-[#f1f3f4] bg-[#fef7e0] px-5 py-3 sm:px-7">
      {visible.map((alert) => (
        <div key={alert.id} className="flex items-start gap-2.5">
          <Megaphone size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[#b06000]" />
          <p className="min-w-0 flex-1 text-[12px] leading-[1.55] text-[#7a4b00]">
            <span className="font-semibold">Law update:</span>{' '}
            {alert.law_reference || alert.law_title}
            {alert.summary ? ` — ${alert.summary}` : ''}
          </p>
          <button
            type="button"
            onClick={() => dismiss(alert.id)}
            aria-label="Dismiss law update"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#b06000] transition-colors hover:bg-black/5"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  );
}