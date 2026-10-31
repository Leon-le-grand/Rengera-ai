import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--app-border-strong)] bg-transparent text-[var(--app-muted)] transition-colors hover:border-[var(--app-accent-border)] hover:text-[var(--app-accent)] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={17} aria-hidden="true" />
      ) : (
        <Moon size={17} aria-hidden="true" />
      )}
    </button>
  );
}
