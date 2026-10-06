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
  Settings as SettingsIcon,
} from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import RengeraLogo from '@/components/brand/RengeraLogo';

export type AppView = 'chat' | 'library' | 'bookmarks' | 'emergency' | 'complaints' | 'business' | 'admin' | 'settings';

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
  { icon: SettingsIcon, label: 'Settings', view: 'settings' },
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
  const isUrgent = item.tone === 'danger';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 px-3 py-2.5 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d8b485]',
        active
          ? 'bg-[#d8b485] font-bold text-zinc-950'
          : 'text-zinc-300 hover:bg-white/5 hover:text-white',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center border transition-colors duration-200',
          active
            ? 'border-zinc-950/20 bg-zinc-950/5 text-zinc-950'
            : 'border-white/10 text-zinc-400 group-hover:border-[#d8b485]/40 group-hover:text-[#d8b485]',
        )}
      >
        <item.icon size={17} strokeWidth={2} />
      </span>

      <span className="truncate font-semibold">{item.label}</span>

      <span
        className={cn(
          'ml-auto h-1.5 w-1.5 shrink-0 transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-0',
          isUrgent ? 'bg-red-500' : 'bg-zinc-950/40',
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#d8b485]">
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
    <aside className="app-surface flex h-full w-72 flex-col border-r border-white/5 bg-[#0c0c0e] text-zinc-300 shadow-[8px_0_30px_-12px_rgba(0,0,0,0.55)]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-5 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 text-white">
          <RengeraLogo size={38} label="" />
          <div className="leading-tight">
            <span className="font-brand block text-xl font-bold tracking-wide text-white">RENGERA AI</span>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#d8b485]">
              Rwanda legal AI
            </span>
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

      <div className="shrink-0 border-t border-white/5 p-3 shadow-[0_-2px_12px_-6px_rgba(0,0,0,0.5)]">
        <div className="mb-2 flex items-center gap-3 border border-white/10 bg-white/[0.02] px-3 py-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.5)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#d8b485]/40 text-xs font-extrabold text-[#d8b485]">
            {isAdmin || isSignedIn ? (initials || <UserRound size={16} />) : <UserRound size={16} />}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-bold text-white">
              {isAdmin || isSignedIn ? userName || 'Member' : 'Public access'}
            </span>
            <span className="truncate text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {isAdmin ? 'Administrator' : isSignedIn ? roleLabel || 'Citizen account' : 'No account required'}
            </span>
          </div>
        </div>

        {isAdmin || isSignedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-3 border border-white/10 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-zinc-300 transition-colors duration-200 hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d8b485]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-zinc-300 transition-colors group-hover:border-[#d8b485]/40 group-hover:text-[#d8b485]">
              <Power size={16} strokeWidth={2} />
            </span>
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="mt-1 flex w-full items-center gap-3 border border-[#d8b485]/40 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-[#d8b485] transition-colors duration-200 hover:bg-[#d8b485] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d8b485]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#d8b485]/30">
              <UserRound size={16} strokeWidth={2} />
            </span>
            Sign in or create account
          </button>
        )}
      </div>
    </aside>
  );
}
