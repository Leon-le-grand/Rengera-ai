'use client';

import { Scale, MessageSquare, BookOpen, Bookmark, ShieldAlert, FileSignature, Settings, Briefcase, Home, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';

export type AppView = 'chat' | 'library' | 'bookmarks' | 'emergency' | 'complaints' | 'business' | 'admin' | 'settings';

interface SidebarProps {
  onExit: () => void;
  onLogout: () => void;
  onClose: () => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userName: string;
}

export default function Sidebar({ onExit, onLogout, onClose, currentView, onViewChange, userName }: SidebarProps) {
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
            <span className="block font-bold text-lg tracking-tight leading-5">Rengera</span>
            <span className="text-xs font-medium text-slate-500">Rwanda legal AI</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-1">
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-red-800">
            <ShieldAlert size={16} />
            Emergency first
          </div>
          <p className="mt-1 text-xs leading-5 text-red-700">Urgent prompts route to official contacts before normal AI guidance.</p>
        </div>

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

        <div className="mt-5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">System</div>
        <button
          onClick={() => handleNavClick('admin')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
            currentView === 'admin'
              ? "bg-amber-50 text-amber-700"
              : "hover:bg-slate-100 hover:text-slate-950"
          )}
        >
          <Settings size={18} />
          Admin Portal
        </button>

        <div className="mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent Queries</div>
        <div className="space-y-1">
          {["Unfair dismissal notice", "Landlord eviction rights", "Business registration fees"].map((q, i) => (
            <button key={i} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-950 hover:bg-slate-100 truncate transition-colors">
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-lg bg-white border border-slate-200">
          <div className="w-9 h-9 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-950">{userName}</span>
            <span className="text-xs text-slate-500">Prototype admin</span>
          </div>
        </div>

        <button 
          onClick={() => handleNavClick('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
            currentView === 'settings' ? "bg-slate-950 text-white" : "hover:bg-slate-100 hover:text-slate-950"
          )}
        >
          <Settings size={18} /> Settings
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:text-slate-950 transition-colors text-slate-500 mt-1"
        >
          <Power size={18} /> Sign out
        </button>
        <button
          onClick={onExit}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:text-slate-950 transition-colors text-slate-500 mt-1"
        >
          <Home size={18} /> Back to Home
        </button>
      </div>
    </aside>
  );
}
