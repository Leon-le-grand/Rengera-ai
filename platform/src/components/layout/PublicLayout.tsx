import { Link } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { RengeraMark } from '@/components/brand/RengeraMark';
import { Button } from '@/components/ui/button';
import { SkipLink } from '@/components/ui/SkipLink';
import { useRouteFocus } from '@/lib/use-route-focus';

export function PublicLayout({
  children,
  accessDenied = false,
}: {
  children: ReactNode;
  accessDenied?: boolean;
}) {
  const mainRef = useRouteFocus<HTMLElement>();
  const { status, user } = useAuth();

  return (
    <div className={`flex min-h-dvh flex-col bg-[var(--app-bg)] ${accessDenied ? 'rengera-access-layout' : ''}`}>
      <SkipLink />
      <header className="border-b border-[var(--app-border)] bg-[var(--app-header)] backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Rengera AI home"
          >
            <RengeraMark size={32} />
            <span className="font-brand truncate text-lg tracking-[0.08em] text-[var(--app-text)]">
              RENGERA
            </span>
          </Link>

          <nav
            aria-label="Public navigation"
            className="ml-auto hidden items-center gap-1 sm:flex"
          >
            <Link
              to="/library"
              className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
            >
              shard library
            </Link>
            <Link
              to="/emergency"
              className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-[var(--app-danger-text)] hover:text-[var(--app-text)]"
            >
              <ShieldAlert size={15} aria-hidden="true" />
              Urgent help
            </Link>
          </nav>

          {!accessDenied && <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {status === 'loading' ? (
              <span className="hidden text-xs text-[var(--app-muted)] md:inline" role="status">
                Checking session…
              </span>
            ) : status === 'authenticated' && user ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">
                  <span className="max-w-32 truncate">{user.display_name}</span>
                </Link>
              </Button>
            ) : status === 'unavailable' ? (
              <Button asChild variant="ghost" size="sm">
                <Link
                  to="/login"
                  title="The account service could not be reached. Open sign-in for details."
                >
                  Account unavailable
                </Link>
              </Button>
            ) : (
              <Button asChild variant="gold" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>}
        </div>
      </header>

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="min-h-0 flex-1 outline-none"
      >
        {children}
      </main>

      <footer className="border-t border-[var(--app-border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="font-brand text-lg tracking-[0.08em] text-[var(--app-text)]">
              RENGERA
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
              Legal information drawn from available Rwandan source shards. Not legal
              advice, not a shard firm, and not a complete collection. Verify
              important matters with official sources or a qualified professional.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[var(--app-muted)]"
          >
            <Link to="/chat" className="min-h-8 hover:text-[var(--app-text)]">
              Ask a question
            </Link>
            <Link to="/library" className="min-h-8 hover:text-[var(--app-text)]">
              shard library
            </Link>
            <Link to="/emergency" className="min-h-8 hover:text-[var(--app-text)]">
              Urgent help
            </Link>

          </nav>
        </div>
      </footer>
    </div>
  );
}
