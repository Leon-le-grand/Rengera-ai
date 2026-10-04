'use client';

import { Check, Languages, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import LanguageMenu, { useStoredLanguage } from '@/components/chat/LanguageMenu';
import { LANGUAGE_DEFINITIONS, ANSWER_LANGUAGES, type AnswerLanguage } from '@/lib/answer-language';
import { cn } from '@/lib/utils';

/** Settings: theme, answer language, account state and the data promise. */
export default function Settings({
  userName,
  isSignedIn,
  isAdmin,
  roleLabel,
  onLogout,
  onLogin,
}: {
  userName: string;
  isSignedIn: boolean;
  isAdmin: boolean;
  roleLabel?: string;
  onLogout: () => void;
  onLogin: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useStoredLanguage();

  return (
    <div className="app-surface mx-auto max-w-4xl space-y-8 p-6 md:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--app-accent)' }}>
          Preferences
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Appearance, language and your account. Everything here is stored on this device unless you
          sign in.
        </p>
      </header>

      {/* Appearance */}
      <section className="border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Sun size={18} className="text-slate-400" />
          Appearance
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Dark is the native theme. Light is a warm off-white, tuned for long reading sessions.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { id: 'dark' as const, label: 'Dark', icon: Moon, hint: 'Zinc canvas, gold accent' },
              { id: 'light' as const, label: 'Light', icon: Sun, hint: 'Warm off-white, low glare' },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={cn(
                'flex items-center justify-between gap-3 border p-4 text-left transition-colors',
                theme === option.id
                  ? 'border-[#d8b485] bg-[#d8b485]/10'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <span className="flex items-center gap-3">
                <option.icon size={18} className="text-slate-500" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </span>
              </span>
              {theme === option.id && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d8b485] text-zinc-950">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Languages size={18} className="text-slate-400" />
          Answer language
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The assistant answers in the language you pick. Law references and article numbers always
          stay exactly as published.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {ANSWER_LANGUAGES.map((code: AnswerLanguage) => (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              className={cn(
                'inline-flex items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors',
                language === code
                  ? 'border-[#d8b485] bg-[#d8b485]/10 text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              {LANGUAGE_DEFINITIONS[code].native}
              {language === code && <Check size={13} strokeWidth={3} style={{ color: 'var(--app-accent)' }} />}
            </button>
          ))}
          <LanguageMenu value={language} onChange={setLanguage} className="ml-auto hidden sm:block" />
        </div>
      </section>

      {/* Account */}
      <section className="border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <UserRound size={18} className="text-slate-400" />
          Account
        </h2>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-slate-200 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {isSignedIn || isAdmin ? userName || 'Member' : 'Public access'}
            </p>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'Administrator' : isSignedIn ? roleLabel || 'Citizen account' : 'No account required'}
            </p>
          </div>

          {isSignedIn || isAdmin ? (
            <button
              type="button"
              onClick={onLogout}
              className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-red-300 hover:text-red-600"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="bg-[#d8b485] px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#c2a277]"
            >
              Sign in
            </button>
          )}
        </div>
      </section>

      {/* Data promise */}
      <section className="border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShieldCheck size={18} className="text-slate-400" />
          Your data
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>· Questions are stored so we can measure the product and fix wrong answers.</li>
          <li>· Documents you upload for review are processed in memory and never stored.</li>
          <li>· Clearing this device removes your local history, language and theme.</li>
        </ul>
        <button
          type="button"
          onClick={() => {
            window.localStorage.clear();
            window.location.reload();
          }}
          className="mt-4 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-red-300 hover:text-red-600"
        >
          Clear local data
        </button>
      </section>
    </div>
  );
}