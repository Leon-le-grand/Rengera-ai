import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { Home, LogOut, RefreshCw, Scale, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { RengeraMark } from '@/components/brand/RengeraMark';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { InlineNotice } from '@/components/ui/InlineNotice';

export function NotFoundPage() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <PublicLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-4 py-20 sm:px-6">
        <p className="eyebrow">404 — Page not found</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--app-text)] sm:text-4xl">
          That page is not part of this build.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--app-muted)]">
          The address <span className="font-mono text-[var(--app-text-2)]">{pathname}</span>{' '}
          does not match a route in the V2 preview. No legal content was found or
          invented for this address.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-primary">
            <Home size={16} aria-hidden="true" />
            Go to the home page
          </Link>
          <Link to="/library" className="btn btn-secondary">
            <Scale size={16} aria-hidden="true" />
            Open the law library
          </Link>
          <Link to="/emergency" className="btn btn-secondary">
            <ShieldAlert size={16} aria-hidden="true" />
            Urgent help
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

export function RouteErrorPage({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'An unexpected client error occurred.';
  return (
    <div className="brand-radial flex min-h-dvh flex-col items-center justify-center bg-[var(--app-bg)] px-4 py-16">
      <div className="w-full max-w-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 sm:p-8">
        <RengeraMark size={42} />
        <p className="eyebrow mt-5">Application error</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--app-text)]">
          This screen could not be rendered.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
          The app hit an unexpected client error. Your account session has not been
          changed. Reload the page or return home.
        </p>
        <p className="mt-3 break-words border border-[var(--app-border)] bg-[var(--app-panel-2)] p-2 font-mono text-xs text-[var(--app-faint)]">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RefreshCw size={15} aria-hidden="true" />
            Try again
          </button>
          <a href="/" className="btn btn-secondary">
            Return home
          </a>
        </div>
      </div>
    </div>
  );
}

export function AuthUnavailablePanel({
  message,
  onRetry,
  retrying = false,
}: {
  message: string | null;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <div className="surface p-6 sm:p-8">
        <p className="eyebrow">Account service unavailable</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--app-text)]">
          Your session could not be verified.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--app-text-2)]">
          {message ??
            'The account service could not be reached. This is not proof that you are signed out, so the protected screen stays closed.'}
        </p>
        <InlineNotice tone="neutral" className="mt-4">
          Public pages, the law library and emergency contacts remain available
          without an account.
        </InlineNotice>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="btn btn-primary"
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              className={retrying ? 'animate-spin' : undefined}
            />
            {retrying ? 'Checking…' : 'Check again'}
          </button>
          <Link to="/library" className="btn btn-secondary">
            Open the law library
          </Link>
          <Link to="/emergency" className="btn btn-secondary">
            Urgent help
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ForbiddenContent() {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      await router.navigate({ to: '/login', search: { redirect: '/chat' } });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-4 py-20 sm:px-6">
        <p className="eyebrow">403 — Access denied</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--app-text)] sm:text-4xl">
          This account cannot open that workspace.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--app-muted)]">
          The screen you requested is restricted. The server remains the authority:
          hiding a link here never grants access to an API operation.
        </p>

        {status === 'authenticated' && user ? (
          <div className="surface mt-6 w-full max-w-xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]">
              Signed in as
            </p>
            <p className="mt-1 text-base font-bold text-[var(--app-text)]">
              {user.display_name}
            </p>
            {user.email ? (
              <p className="text-sm text-[var(--app-muted)]">{user.email}</p>
            ) : null}
            <p className="mt-2 text-xs text-[var(--app-faint)]">
              Role: {user.role} · Status: {user.status}
            </p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="btn btn-secondary mt-4"
            >
              <LogOut size={15} aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out and use another account'}
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" search={{ redirect: '/chat' }} className="btn btn-primary">
              Sign in
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-secondary">
            <Home size={16} aria-hidden="true" />
            Home
          </Link>
          <Link to="/library" className="btn btn-secondary">
            <Scale size={16} aria-hidden="true" />
            Law library
          </Link>
          <Link to="/emergency" className="btn btn-secondary">
            <ShieldAlert size={16} aria-hidden="true" />
            Urgent help
          </Link>
        </div>
    </div>
  );
}
