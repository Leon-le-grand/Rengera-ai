import { Link, useLocation, useRouter } from '@tanstack/react-router';
import {
  BookOpen,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessAdminWorkspace, canAccessStaffWorkspace } from '@/auth/capabilities';
import { RengeraMark } from '@/components/brand/RengeraMark';
import { SkipLink } from '@/components/ui/SkipLink';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { useRouteFocus } from '@/lib/use-route-focus';

type AppPath =
  | '/chat'
  | '/library'
  | '/emergency'
  | '/settings'
  | '/staff'
  | '/admin';

interface NavItem {
  to: AppPath;
  label: string;
  icon: LucideIcon;
  matchPrefixes: string[];
  urgent?: boolean;
}

function useNavItems(): NavItem[] {
  const auth = useAuth();
  const isAuthenticated = auth.status === 'authenticated';
  const canStaff = canAccessStaffWorkspace(auth.capabilities);
  const canAdmin = canAccessAdminWorkspace(auth.capabilities);

  const items: NavItem[] = [
    {
      to: '/chat',
      label: 'Ask a question',
      icon: MessageSquare,
      matchPrefixes: ['/chat'],
    },
    {
      to: '/library',
      label: 'Law library',
      icon: BookOpen,
      matchPrefixes: ['/library', '/laws'],
    },
    {
      to: '/emergency',
      label: 'Urgent help',
      icon: ShieldAlert,
      matchPrefixes: ['/emergency'],
      urgent: true,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
      matchPrefixes: ['/settings'],
    },
  ];

  if (!isAuthenticated) {
    return items.filter((item) => item.to !== '/settings');
  }

  return [
    ...items,
    ...(canStaff
      ? [
          {
            to: '/staff' as const,
            label: 'Staff workspace',
            icon: Wrench,
            matchPrefixes: ['/staff'],
          },
        ]
      : []),
    ...(canAdmin
      ? [
          {
            to: '/admin' as const,
            label: 'Admin workspace',
            icon: ShieldCheck,
            matchPrefixes: ['/admin'],
          },
        ]
      : []),
  ];
}

function NavList({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <nav aria-label="Primary" className="space-y-1">
      {items.map((item) => {
        const active = item.matchPrefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        );
        const Icon = item.icon;

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-h-11 items-center gap-3 border px-3 py-2 text-sm font-semibold transition-colors',
              active
                ? 'border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-text-2)] hover:border-[var(--app-border)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]',
              item.urgent &&
                !active &&
                'text-[var(--app-danger-text)] hover:text-[var(--app-danger-text)]',
            )}
          >
            <Icon
              size={17}
              strokeWidth={2}
              aria-hidden="true"
              className={cn(
                active
                  ? 'text-[var(--app-accent)]'
                  : item.urgent
                    ? 'text-[var(--app-danger-text)]'
                    : 'text-[var(--app-muted)] group-hover:text-[var(--app-accent)]',
              )}
            />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.urgent ? (
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                112
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

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

function AccountPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { status, user, error, refreshing, logout, refresh } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (status === 'loading') {
    return (
      <div className="border border-[var(--app-border)] p-3" role="status">
        <p className="text-xs font-semibold text-[var(--app-muted)]">
          Checking your session…
        </p>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] p-3">
        <p className="text-xs font-bold text-[var(--app-warning-text)]">
          Account service unavailable
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--app-text-2)]">
          {error?.message ??
            'Sessions cannot be verified right now. Public pages still work.'}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="btn btn-secondary mt-2 min-h-9 px-2.5 py-1.5 text-xs"
        >
          <RefreshCw
            size={13}
            aria-hidden="true"
            className={refreshing ? 'animate-spin' : undefined}
          />
          {refreshing ? 'Checking…' : 'Retry'}
        </button>
      </div>
    );
  }

  if (status === 'anonymous' || !user) {
    return (
      <div className="border border-[var(--app-border)] p-3">
        <p className="text-xs font-bold text-[var(--app-text)]">Browsing as a guest</p>
        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
          Ask questions and read available laws without an account.
        </p>
        <Link
          to="/login"
          onClick={onNavigate}
          className="btn btn-secondary mt-2 min-h-9 px-2.5 py-1.5 text-xs"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      onNavigate?.();
      await router.navigate({ to: '/' });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="border border-[var(--app-border)] p-3">
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--app-border-strong)] text-[var(--app-accent)]">
          <UserRound size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--app-text)]">
            {user.display_name}
          </p>
          {user.email && user.email !== user.display_name ? (
            <p className="truncate text-xs text-[var(--app-muted)]">{user.email}</p>
          ) : null}
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-faint)]">
            {roleLabel(user.role)}
            {user.status !== 'active' && user.status !== 'unknown'
              ? ` · ${user.status}`
              : ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="btn btn-secondary min-h-9 px-2.5 py-1.5 text-xs"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="btn btn-ghost min-h-9 px-2.5 py-1.5 text-xs"
        >
          <LogOut size={13} aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNavItems();

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-1 py-1"
        aria-label="Rengera AI home"
      >
        <RengeraMark size={34} />
        <span className="min-w-0">
          <span className="block font-brand text-xl leading-none tracking-[0.08em] text-[var(--app-text)]">
            RENGERA
          </span>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--app-faint)]">
            V2 preview
          </span>
        </span>
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavList items={items} onNavigate={onNavigate} />

        <div className="my-4 border-t border-[var(--app-border)]" />

        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--app-danger-text)]">
            <ShieldAlert size={14} aria-hidden="true" />
            Immediate danger?
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-text-2)]">
            Call 112. This path never waits for an AI response.
          </p>
          <Link
            to="/emergency"
            onClick={onNavigate}
            className="mt-2 inline-flex min-h-9 items-center text-xs font-bold text-[var(--app-danger-text)] underline underline-offset-4"
          >
            Open emergency contacts
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <AccountPanel onNavigate={onNavigate} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] leading-4 text-[var(--app-faint)]">
            Legal information, not legal advice.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const mainRef = useRouteFocus<HTMLElement>();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [openPath, setOpenPath] = useState<string | null>(null);
  const mobileOpen = openPath === pathname;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPath(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <SkipLink />

      <aside className="sticky top-0 hidden h-dvh border-r border-[var(--app-border)] bg-[var(--app-panel)] lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-header)] px-4 py-2 backdrop-blur-md lg:hidden">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2"
            aria-label="Rengera AI home"
          >
            <RengeraMark size={30} />
            <span className="font-brand truncate text-lg tracking-[0.08em] text-[var(--app-text)]">
              RENGERA
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpenPath(mobileOpen ? null : pathname)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex h-11 w-11 items-center justify-center border border-[var(--app-border-strong)] text-[var(--app-text)]"
            >
              {mobileOpen ? (
                <X size={19} aria-hidden="true" />
              ) : (
                <Menu size={19} aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {mobileOpen ? (
          <div
            id="mobile-navigation"
            className="border-b border-[var(--app-border)] bg-[var(--app-panel)] lg:hidden"
          >
            <SidebarContent onNavigate={() => setOpenPath(null)} />
          </div>
        ) : null}

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="min-h-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>

        <footer className="border-t border-[var(--app-border)] px-4 py-4 text-[10px] leading-4 text-[var(--app-faint)] sm:px-6 lg:px-8">
          Rengera provides legal information from available sources, not legal
          advice or a complete collection. V2 preview.
        </footer>
      </div>
    </div>
  );
}
