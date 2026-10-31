import { Link, useRouter } from '@tanstack/react-router';
import {
  BookOpen,
  CheckCircle2,
  KeyRound,
  Languages,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

import {
  CAPABILITIES,
  STAFF_WORKSPACE_PERMISSIONS,
} from '@/auth/capabilities';
import { useAuth } from '@/auth/AuthProvider';
import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/ui/PageHeader';
import { LanguageSelect } from '@/components/ui/LanguageSelect';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { useTheme } from '@/app/theme';
import { useLanguage } from '@/i18n/LanguageProvider';

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'staff':
      return 'Staff';
    case 'user':
      return 'Citizen';
    default:
      return 'Account';
  }
}

export function SettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (auth.status !== 'authenticated' || !auth.user) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <InlineNotice tone="warning" title="No verified account">
          This page needs a verified session. Public pages remain available.
        </InlineNotice>
        <div className="mt-4 flex gap-2">
          <Link to="/login" search={{ redirect: '/settings' }} className="btn btn-primary">
            Sign in
          </Link>
          <Link to="/library" className="btn btn-secondary">
            Law library
          </Link>
        </div>
      </div>
    );
  }

  const user = auth.user;
  const checkedAt = auth.lastCheckedAt
    ? new Date(auth.lastCheckedAt)
    : null;

  const handleSignOut = async () => {
    setSigningOut(true);
    setMessage(null);
    try {
      const result = await auth.logout();
      if (result.message) {
        setMessage(result.message);
      }
      await router.navigate({ to: '/' });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your verified account, access state and local display preferences. The server remains the authority for every permission."
      />

      {message ? (
        <InlineNotice tone="warning" className="mt-5" role="status">
          {message}
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="surface p-5" aria-labelledby="account-heading">
          <h2
            id="account-heading"
            className="flex items-center gap-2 text-base font-bold text-[var(--app-text)]"
          >
            <UserRound size={17} aria-hidden="true" className="text-[var(--app-accent)]" />
            Account
          </h2>

          <div className="mt-4 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--app-border-strong)] text-[var(--app-accent)]">
              <UserRound size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-[var(--app-text)]">
                {user.display_name}
              </p>
              {user.email ? (
                <p className="truncate text-sm text-[var(--app-muted)]">{user.email}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">{roleLabel(user.role)}</span>
                <span className="chip capitalize">{user.status}</span>
              </div>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-[var(--app-border)] pt-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[var(--app-muted)]">Account ID</dt>
              <dd className="max-w-[60%] break-all text-right font-mono text-xs text-[var(--app-text-2)]">
                {user.id}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[var(--app-muted)]">Policy version</dt>
              <dd className="text-right text-[var(--app-text-2)]">
                {auth.policyVersion ?? 'Not supplied'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[var(--app-muted)]">Session checked</dt>
              <dd className="text-right text-[var(--app-text-2)]">
                {checkedAt && !Number.isNaN(checkedAt.getTime())
                  ? checkedAt.toLocaleString()
                  : 'Not recorded'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void auth.refresh()}
              disabled={auth.refreshing}
              className="btn btn-secondary"
            >
              <RefreshCw
                size={15}
                aria-hidden="true"
                className={auth.refreshing ? 'animate-spin' : undefined}
              />
              {auth.refreshing ? 'Checking…' : 'Refresh session'}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="btn btn-ghost"
            >
              <LogOut size={15} aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="surface p-5" aria-labelledby="preferences-heading">
            <h2
              id="preferences-heading"
              className="flex items-center gap-2 text-base font-bold text-[var(--app-text)]"
            >
              <Monitor size={17} aria-hidden="true" className="text-[var(--app-accent)]" />
              Display and language
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
              These preferences are stored on this device only. They never grant
              account access.
            </p>

            <fieldset className="mt-4">
              <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
                Theme
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className={
                    theme === 'dark'
                      ? 'btn btn-secondary border-[var(--app-accent-border)] bg-[var(--app-accent-soft)]'
                      : 'btn btn-ghost border border-[var(--app-border)]'
                  }
                >
                  <Moon size={15} aria-hidden="true" />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className={
                    theme === 'light'
                      ? 'btn btn-secondary border-[var(--app-accent-border)] bg-[var(--app-accent-soft)]'
                      : 'btn btn-ghost border border-[var(--app-border)]'
                  }
                >
                  <Sun size={15} aria-hidden="true" />
                  Light
                </button>
              </div>
            </fieldset>

            <div className="mt-4">
              <LanguageSelect
                value={language}
                onChange={setLanguage}
                id="settings-language"
                label="Answer language"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--app-faint)]">
                <Languages size={12} aria-hidden="true" />
                Used for answer requests and emergency guidance.
              </p>
            </div>
          </section>

          <section className="surface p-5" aria-labelledby="access-heading">
            <h2
              id="access-heading"
              className="flex items-center gap-2 text-base font-bold text-[var(--app-text)]"
            >
              <ShieldCheck size={17} aria-hidden="true" className="text-[var(--app-accent)]" />
              Access
            </h2>
            {auth.capabilities.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {auth.capabilities.map((capability) => (
                  <li key={capability} className="chip font-mono">
                    {capability}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                The server supplied no special capabilities for this account.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Can anyOf={STAFF_WORKSPACE_PERMISSIONS} fallback={null}>
                <Link to="/staff" className="btn btn-secondary">
                  <Wrench size={15} aria-hidden="true" />
                  Staff workspace
                </Link>
              </Can>
              <Can permission={CAPABILITIES.lawPublish} fallback={null}>
                <Link to="/admin" className="btn btn-secondary">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Admin workspace
                </Link>
              </Can>
              <Link to="/library" className="btn btn-secondary">
                <BookOpen size={15} aria-hidden="true" />
                Law library
              </Link>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-[var(--app-faint)]">
              Capability names are supplied by the server. Hiding a link is not an
              access control.
            </p>
          </section>
        </div>
      </div>

      <section className="mt-5 border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
          <KeyRound size={15} aria-hidden="true" className="text-[var(--app-muted)]" />
          Not available in this preview
        </h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--app-muted)] sm:grid-cols-2">
          {[
            'Changing your password',
            'Changing your email address',
            'Downloading or deleting account data',
            'Managing other staff accounts',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2
                size={13}
                aria-hidden="true"
                className="mt-1 shrink-0 text-[var(--app-faint)]"
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--app-faint)]">
          <ShieldAlert size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
          These controls are not shown as working buttons because the V2 API
          endpoints for them are not part of this build.
        </p>
      </section>
    </div>
  );
}
