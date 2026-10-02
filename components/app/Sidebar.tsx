'use client';

import {
  MessageSquare,
  BookOpen,
  ShieldAlert,
  FileSignature,
  Bookmark,
  Briefcase,
  Database,
  Power,
  UserRound,
  Scale,
} from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AppView = 'chat' | 'library' | 'bookmarks' | 'emergency' | 'complaints' | 'business' | 'admin';

interface NavItem {
  icon: ElementType;
  label: string;
  view: AppView;
  tone?: 'danger' | 'admin';
}

interface SidebarProps {
  onLogout: () => void | Promise<void>;
  onLogin: () => void;
  onClose: () => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userName: string;
  isAdmin?: boolean;
  isSignedIn?: boolean;
  roleLabel?: string;
}

const CITIZEN_NAV: NavItem[] = [
  { icon: MessageSquare, label: 'AI Assistant', view: 'chat' },
  { icon: BookOpen, label: 'Law Library', view: 'library' },
  { icon: FileSignature, label: 'Complaints', view: 'complaints' },
  { icon: Bookmark, label: 'Saved Answers', view: 'bookmarks' },
  { icon: ShieldAlert, label: 'Emergency', view: 'emergency', tone: 'danger' },
];

const BUSINESS_NAV: NavItem[] = [{ icon: Briefcase, label: 'Business', view: 'business' }];

const ADMIN_NAV: NavItem[] = [
  { icon: Database, label: 'Law Ingestion', view: 'admin', tone: 'admin' },
];

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const isDanger = item.tone === 'danger';
  const isAdminItem = item.tone === 'admin';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        active
          ? isDanger
            ? 'bg-red-50 text-red-700 shadow-sm'
            : isAdminItem
              ? 'bg-violet-50 text-violet-700 shadow-sm'
              : 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
          : isDanger
            ? 'text-red-600 hover:bg-red-50'
            : isAdminItem
              ? 'text-violet-600 hover:bg-violet-50'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
          active
            ? isDanger
              ? 'bg-white text-red-600'
              : isAdminItem
                ? 'bg-white text-violet-600'
                : 'bg-white/10 text-white'
            : isDanger
              ? 'bg-red-100 text-red-600 group-hover:bg-white'
              : isAdminItem
                ? 'bg-violet-100 text-violet-600 group-hover:bg-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900',
        )}
      >
        <item.icon size={16} strokeWidth={2.25} />
      </span>

      <span className="truncate">{item.label}</span>

      <span
        className={cn(
          'ml-auto h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300',
          active ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          isDanger ? 'bg-red-500' : isAdminItem ? 'bg-violet-500' : 'bg-emerald-400',
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </p>
  );
}

export default function Sidebar({
  onLogout,
  onLogin,
  onClose,
  currentView,
  onViewChange,
  userName,
  isAdmin = false,
  isSignedIn = false,
  roleLabel,
}: SidebarProps) {
  const handleNavClick = (view: AppView) => {
    onViewChange(view);
    onClose();
  };

  const initials = userName.trim() ? userName.trim().slice(0, 2).toUpperCase() : null;

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white text-slate-600 shadow-2xl lg:shadow-none">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
        <div className="flex items-center gap-3 text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
            <Scale size={17} strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <span className="font-brand block text-lg tracking-wide">RENGERA AI</span>
            <span className="text-xs font-medium text-slate-500">Rwanda legal AI</span>
          </div>
        </div>
      </div>

      <div className="scrollbar-hide flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        <div>
          <SectionLabel>Citizen Platform</SectionLabel>
          <div className="flex flex-col gap-1">
            {CITIZEN_NAV.map((item) => (
              <NavButton
                key={item.view}
                item={item}
                active={currentView === item.view}
                onClick={() => handleNavClick(item.view)}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Business Solutions</SectionLabel>
          <div className="flex flex-col gap-1">
            {BUSINESS_NAV.map((item) => (
              <NavButton
                key={item.view}
                item={item}
                active={currentView === item.view}
                onClick={() => handleNavClick(item.view)}
              />
            ))}
          </div>
        </div>

        {isAdmin && (
          <div>
            <SectionLabel>Administrator</SectionLabel>
            <div className="flex flex-col gap-1">
              {ADMIN_NAV.map((item) => (
                <NavButton
                  key={item.view}
                  item={item}
                  active={currentView === item.view}
                  onClick={() => handleNavClick(item.view)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3">
        <div
          className={cn(
            'mb-2 flex items-center gap-3 rounded-xl border px-3 py-3',
            isAdmin
              ? 'border-emerald-200 bg-emerald-50'
              : isSignedIn
                ? 'border-slate-200 bg-white'
                : 'border-slate-200 bg-white',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
              isAdmin
                ? 'bg-emerald-600 text-white shadow-sm'
                : isSignedIn
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500',
            )}
          >
            {isAdmin || isSignedIn ? (initials || <UserRound size={16} />) : <UserRound size={16} />}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold text-slate-950">
              {isAdmin || isSignedIn ? userName || 'Member' : 'Public access'}
            </span>
            <span className="truncate text-xs text-slate-500">
              {isAdmin ? 'Administrator' : isSignedIn ? roleLabel || 'Citizen account' : 'No account required'}
            </span>
          </div>
        </div>

        {isAdmin || isSignedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-all duration-200 hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors duration-200 group-hover:bg-red-100">
              <Power size={16} strokeWidth={2.25} />
            </span>
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-200 hover:-translate-y-px hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors duration-200">
              <UserRound size={16} strokeWidth={2.25} />
            </span>
            Sign in or create account
          </button>
        )}
      </div>
    </aside>
  );
}
