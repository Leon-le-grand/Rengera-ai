'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'rengera_theme_v1';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
});

/**
 * Dark is the product's native theme — it is the landing page's palette. Light
 * is a warm off-white, not pure white, so reading law text does not glare.
 * The choice is stored locally and applied to <html data-theme>, which every
 * theme token in globals.css keys off.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === 'dark' || raw === 'light') stored = raw;
    } catch {
      stored = null;
    }

    const next = stored ?? 'dark';
    setThemeState(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}