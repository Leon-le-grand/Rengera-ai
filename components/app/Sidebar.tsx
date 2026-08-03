'use client';

import { Scale, MessageSquare, BookOpen, Bookmark, ShieldAlert, FileSignature, Settings, LogOut, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppView = 'chat' | 'library' | 'bookmarks' | 'emergency' | 'complaints' | 'business' | 'admin' | 'settings';

interface SidebarProps {
  onExit: () => void;
  onClose: () => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export default function Sidebar({ onExit, onClose, currentView, onViewChange }: SidebarProps) {
  const navItems: { icon: any, label: string, view: AppView }[] = [
    { icon: MessageSquare, label: 'AI Assistant', view: 'chat' },
    { icon: BookOpen, label: 'Law Library', view: 'library' },
    { icon: Bookmark, label: 'Saved Answers', view: 'bookmarks' },
    { icon: ShieldAlert, label: 'Emergency', view: 'emergency' },
    { icon: FileSignature, label: 'Complaints', view: 'complaints' },
  ];

  const handleNavClick = (view: AppView) => {
    onViewChange(view);
    onClose();
  };

  return (
    <aside className="w-72 h-full bg-slate-900 flex flex-col text-slate-300 shadow-2xl lg:shadow-none border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/50 justify-between">
        <div className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Scale size={16} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">Rengera</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Citizen Platform</div>
        
        {navItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleNavClick(item.view)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              currentView === item.view 
                ? "bg-emerald-500/10 text-emerald-400" 
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}

        <div className="mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Business Solutions</div>
        <button
          onClick={() => handleNavClick('business')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            currentView === 'business'
              ? "bg-blue-500/10 text-blue-400" 
              : "hover:bg-slate-800 hover:text-white"
          )}
        >
          <Briefcase size={18} />
          Business Dashboard
        </button>

        <div className="mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">System</div>
        <button
          onClick={() => handleNavClick('admin')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            currentView === 'admin'
              ? "bg-amber-500/10 text-amber-400" 
              : "hover:bg-slate-800 hover:text-white"
          )}
        >
          <Settings size={18} />
          Admin Portal
        </button>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Recent Queries</div>
        <div className="space-y-1">
          {["Unfair dismissal notice", "Landlord eviction rights", "Business registration fees"].map((q, i) => (
            <button key={i} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 truncate transition-colors">
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">John Doe</span>
            <span className="text-xs text-slate-400">Basic Account</span>
          </div>
        </div>

        <button 
          onClick={() => handleNavClick('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
            currentView === 'settings' ? "bg-slate-800 text-white" : "hover:bg-slate-800 hover:text-white"
          )}
        >
          <Settings size={18} /> Settings
        </button>
        <button 
          onClick={onExit}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors text-slate-400 mt-1"
        >
          <LogOut size={18} /> Back to Home
        </button>
      </div>
    </aside>
  );
}
