'use client';

import { Scale, MessageSquare, BookOpen, Bookmark, ShieldAlert, FileSignature, Briefcase, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';

export type AppView = 'chat' | 'library' | 'bookmarks' | 'emergency' | 'complaints' | 'business' | 'admin';

interface SidebarProps {
  onLogout: () => void | Promise<void>;
  onLogin: () => void;
  onClose: () => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userName: string;
  isAdmin?: boolean;
}

export default function Sidebar({
  onLogout,
  onLogin,
  onClose,
  currentView,
  onViewChange,
  userName,
  isAdmin = false,
}: SidebarProps) {
  const navItems: { icon: ElementType, label: string, view: AppView, tone?: 'danger' }[] = [
    { icon: MessageSquare, label: 'AI Assistant', view: 'chat' },
    { icon: BookOpen, label: 'Law Library', view: 'library' },
    { icon: ShieldAlert, label: 'Emergency', view: 'emergency', tone: 'danger' },
    { icon: FileSignature, label: 'Complaints', view: 'complaints' },
    { icon: Bookmark, label: 'Saved Answers', view: 'bookmarks' },
  ];

  const handleNavClick = (view: AppView) => {
    onViewChange(view);
    onClose();
  };

  return (
    <aside className="w-72 h-full bg-white flex flex-col text-slate-600 shadow-2xl lg:shadow-none border-r border-slate-200">
      <div className="h-16 flex items-center px-5 border-b border-slate-200 justify-between">
        <div className="flex items-center gap-3 text-slate-950">
          <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-white">
            <Scale size={16} strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-brand block text-lg leading-6 tracking-wide">RENGERA AI</span>
            <span className="text-xs font-medium text-slate-500">Rwanda legal AI</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Citizen Platform</div>
        
        {navItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleNavClick(item.view)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
              currentView === item.view 
                ? item.tone === 'danger'
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-950 text-white"
                : item.tone === 'danger'
                  ? "text-red-700 hover:bg-red-50"
                  : "hover:bg-slate-100 hover:text-slate-950"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}

        <div className="mt-5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Business Solutions</div>
        <button
          onClick={() => handleNavClick('business')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
            currentView === 'business'
              ? "bg-blue-50 text-blue-700"
              : "hover:bg-slate-100 hover:text-slate-950"
          )}
        >
          <Briefcase size={18} />
          Business Dashboard
        </button>

      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50">
        {isAdmin ? (
          <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-lg bg-white border border-slate-200">
            <div className="w-9 h-9 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-950 truncate">{userName}</span>
              <span className="text-xs text-slate-500">Administrator</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-lg border border-slate-200 bg-white">
            <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
              <ShieldAlert size={17} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-950">Public access</span>
              <span className="text-xs text-slate-500">No account required</span>
            </div>
          </div>
        )}

        {isAdmin ? (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:text-slate-950 transition-colors text-slate-500 mt-1"
          >
            <Power size={18} /> Sign out
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-950 hover:bg-slate-100 transition-colors"
          >
            <Power size={18} /> Admin sign in
          </button>
        )}
      </div>
    </aside>
  );
}
