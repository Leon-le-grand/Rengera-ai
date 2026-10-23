'use client';

import { useEffect } from 'react';

/**
 * Mobile-only setup: status bar colour, splash behaviour, and back-button
 * handling (Android hardware back). Runs once when mounted inside the
 * Capacitor WebView.
 */
export default function MobileShell() {
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#09090b' });

        const { App } = await import('@capacitor/app');
        const handler = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanup = () => handler.remove();
      } catch {
        // Web build: no Capacitor bridge present — do nothing.
      }
    })();
    return () => {
      cleanup?.();
    };
  }, []);
  return null;
}
