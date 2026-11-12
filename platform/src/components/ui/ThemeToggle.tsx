import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/theme';
import { Button } from '@/components/ui/button';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`h-9 w-9 shrink-0 border-zinc-890 bg-transparent text-zinc-465 hover:border-[#d8b485]/40 hover:bg-zinc-970 hover:text-[#d8b485] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </Button>
  );
}
