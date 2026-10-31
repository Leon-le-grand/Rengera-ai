import { useRouter } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { safeReturnPath } from '@/lib/safe-url';

interface LoginPageProps {
  redirect?: string;
}

function destinationFor(redirect: string | undefined): string {
  return safeReturnPath(redirect);
}

export function LoginPage({ redirect }: LoginPageProps) {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const destination = destinationFor(redirect);

  const goToDestination = async () => {
    router.history.push(destination);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setRequestId(null);

    if (!email.trim() || !password) {
      setError('Enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await auth.login({
        email: email.trim(),
        password,
      });

      if (!result.ok) {
        setError(result.message ?? 'Sign-in could not be completed.');
        setRequestId(result.requestId ?? null);
        return;
      }

      setPassword('');
      await goToDestination();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      const result = await auth.logout();
      if (result.message) setError(result.message);
    } finally {
      setSigningOut(false);
    }
  };

  if (auth.status === 'authenticated' && auth.user) {
    return (
      <div className="brand-radial min-h-[calc(100dvh-8rem)]">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:py-20">
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--app-text)] sm:text-4xl">
              You are already signed in.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
              Continue to the protected workspace, or sign out if you are using a
              shared device.
            </p>

            <div className="surface mt-6 max-w-lg p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--app-border-strong)] text-[var(--app-accent)]">
                  <UserRound size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[var(--app-text)]">
                    {auth.user.display_name}
                  </p>
                  {auth.user.email ? (
                    <p className="truncate text-sm text-[var(--app-muted)]">
                      {auth.user.email}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
                    Role: {auth.user.role} · Status: {auth.user.status}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void goToDestination()}
                  className="btn btn-primary"
                >
                  Continue
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="btn btn-secondary"
                >
                  <LogOut size={15} aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>

            {error ? (
              <InlineNotice tone="warning" className="mt-4 max-w-lg" role="alert">
                {error}
              </InlineNotice>
            ) : null}
          </div>

          <AccountExplainer />
        </div>
      </div>
    );
  }

  return (
    <div className="brand-radial min-h-[calc(100dvh-8rem)]">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:py-20">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--app-text)] sm:text-4xl">
            Sign in to your workspace.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
            Public law information does not require an account. Sign in for
            account-scoped tools and staff or administrator workspaces.
          </p>

          {auth.status === 'unavailable' ? (
            <InlineNotice
              tone="warning"
              title="The account service could not be reached"
              className="mt-5"
              role="alert"
            >
              <p>
                {auth.error?.message ??
                  'Sessions cannot be verified right now. This is different from being signed out.'}
              </p>
              <button
                type="button"
                onClick={() => void auth.refresh()}
                disabled={auth.refreshing}
                className="btn btn-secondary mt-3 min-h-9 px-3 py-1.5 text-xs"
              >
                <RefreshCw
                  size={13}
                  aria-hidden="true"
                  className={auth.refreshing ? 'animate-spin' : undefined}
                />
                {auth.refreshing ? 'Checking…' : 'Retry session check'}
              </button>
            </InlineNotice>
          ) : null}

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 max-w-lg">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]"
                >
                  Email address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(error) || undefined}
                  disabled={submitting}
                  className="field"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(error) || undefined}
                    disabled={submitting}
                    className="field pr-12"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-4 border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] px-4 py-3 text-sm leading-6 text-[var(--app-danger-text)]"
              >
                <p>{error}</p>
                {requestId ? (
                  <p className="mt-1 break-all text-xs">
                    Request ID: <span className="font-mono">{requestId}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || auth.status === 'loading'}
              className="btn btn-primary mt-5 w-full"
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} aria-hidden="true" className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LockKeyhole size={15} aria-hidden="true" />
                  Sign in
                </>
              )}
            </button>

            <p className="mt-3 text-xs leading-5 text-[var(--app-faint)]">
              Account creation and password recovery are not available in this
              preview. If you were expecting an account, contact the administrator
              who invited you.
            </p>
          </form>

          {redirect ? (
            <p className="mt-4 text-xs text-[var(--app-muted)]">
              After signing in you will return to{' '}
              <span className="font-mono text-[var(--app-text-2)]">
                {destination}
              </span>
              .
            </p>
          ) : null}
        </div>

        <AccountExplainer />
      </div>
    </div>
  );
}

function AccountExplainer() {
  return (
    <aside className="surface h-fit p-6">
      <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
        <ShieldCheck size={17} aria-hidden="true" className="text-[var(--app-accent)]" />
        Account-scoped by design
      </p>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--app-muted)]">
        {[
          {
            title: 'No fabricated session',
            body: 'A signed-in screen appears only after the server confirms an account identity.',
          },
          {
            title: 'Private cache cleared',
            body: 'Cached private data is dropped on sign-out or when the verified account changes.',
          },
          {
            title: 'Server is authoritative',
            body: 'Menu visibility is presentation only. Every protected request is checked by the API.',
          },
          {
            title: 'Shared-device care',
            body: 'Sign out when you finish, especially on a device you do not own.',
          },
        ].map((item) => (
          <li key={item.title} className="flex items-start gap-2.5">
            <CheckCircle2
              size={15}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--app-accent)]"
            />
            <span>
              <strong className="font-bold text-[var(--app-text)]">
                {item.title}.
              </strong>{' '}
              {item.body}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-[var(--app-border)] pt-4 text-xs leading-5 text-[var(--app-faint)]">
        Rengera does not ask for a national ID, case number or payment details to
        read public legal information.
      </div>
    </aside>
  );
}
