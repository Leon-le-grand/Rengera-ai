import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';

export type Theme = 'dark';

const STORAGE_KEY = 'rengera_theme_v1';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => undefined,
  toggle: () => undefined,
});

function enforceDarkTheme() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'dark');
    } catch {
      // Ignore storage errors
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    enforceDarkTheme();
  }, []);

  const setTheme = useCallback(() => {
    enforceDarkTheme();
  }, []);

  const toggle = useCallback(() => {
    enforceDarkTheme();
  }, []);

  const value = useMemo(
    () => ({ theme: 'dark' as const, setTheme, toggle }),
    [setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
