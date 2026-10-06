'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getLawChangeAlerts, type LawChangeAlert } from '@/app/product-actions';

const SEEN_KEY = 'rengera_law_alerts_seen_v1';

function loadSeen(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Bell in the dashboard top bar. Polls law_change_alerts (written automatically
 * by classifyAndStoreLaw), so every citizen sees a new law the moment an admin
 * uploads it. Read state is local per device.
 */
export default function NotificationsBell() {
  const [alerts, setAlerts] = useState<LawChangeAlert[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSeen(loadSeen());
    let cancelled = false;

    const fetchAlerts = async () => {
      try {
        const result = await getLawChangeAlerts(10);
        if (!cancelled && result.success) setAlerts(result.alerts);
      } catch {
        // Notifications are a bonus; never break the dashboard.
      }
    };

    void fetchAlerts();
    const timer = window.setInterval(fetchAlerts, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const unread = alerts.filter((a) => !seen.includes(a.id));

  const markAllSeen = () => {
    const ids = alerts.map((a) => a.id);
    setSeen(ids);
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    } catch {
      // Non-fatal.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllSeen();
        }}
        aria-label={unread.length > 0 ? `${unread.length} new law notifications` : 'Notifications'}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Bell size={17} strokeWidth={2} />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--chat-border)] bg-[var(--chat-panel)] shadow-xl">
            <div className="border-b border-[var(--chat-border-soft)] px-4 py-3">
              <p className="text-sm font-bold text-[var(--chat-text)]">New laws & updates</p>
              <p className="text-xs text-[var(--chat-muted)]">
                Posted by administrators when a law is uploaded.
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--chat-muted)]">
                  No notifications yet. New uploads will appear here.
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border-b border-[var(--chat-border-soft)] px-4 py-3 last:border-0"
                  >
                    <p className="text-[13px] font-semibold text-[var(--chat-text)]">
                      {alert.law_reference || alert.law_title}
                      <span className="ml-2 rounded-full bg-[var(--chat-chip)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--chat-muted)]">
                        {alert.alert_type === 'new_law' ? 'New law' : alert.alert_type}
                      </span>
                    </p>
                    {alert.summary && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--chat-muted)]">
                        {alert.summary}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
