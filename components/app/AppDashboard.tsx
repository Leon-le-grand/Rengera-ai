'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import { Menu } from 'lucide-react';

interface AppDashboardProps {
  onExit: () => void;
}

export default function AppDashboard({ onExit }: AppDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onExit={onExit} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-slate-200 flex items-center px-4 lg:hidden bg-white shrink-0">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-bold text-slate-900">Rengera Chat</span>
        </header>
        
        <main className="flex-1 relative overflow-hidden bg-slate-50/50">
          <ChatInterface />
        </main>
      </div>
    </div>
  );
}
