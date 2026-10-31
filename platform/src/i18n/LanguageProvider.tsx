import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import {
  resolveAnswerLanguage,
  type AnswerLanguage,
} from './languages';

const STORAGE_KEY = 'rengera_language_v1';

interface LanguageContextValue {
  language: AnswerLanguage;
  setLanguage: (next: AnswerLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => undefined,
});

function readStoredLanguage(): AnswerLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    return resolveAnswerLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'en';
  }
}

/**
 * Answer-language preference shared by chat, the law reader and emergency
 * guidance. It is a local preference, not an authorization signal.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AnswerLanguage>(() =>
    readStoredLanguage(),
  );

  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  const setLanguage = useCallback((next: AnswerLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference persistence is optional; the current session still works.
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
