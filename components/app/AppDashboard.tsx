'use client';
import { useState } from 'react';
import Sidebar, { AppView } from './Sidebar';
import ChatInterface from "./ChatInterface";
import LawLibrary from "./LawLibrary";
import Complaints from "./Complaints";
import Emergency from "./Emergency";
import BusinessDashboard from './BusinessDashboard';
import AdminDashboard from './AdminDashboard';
import LoginScreen from './LoginScreen';
import { Menu, ShieldAlert, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PRIORITY_IMPLEMENTATION_MAP } from '@/lib/safety';

interface AppDashboardProps {
  onExit: () => void;
}

export default function AppDashboard({ onExit }: AppDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [user, setUser] = useState<{ name: string; role: 'admin' } | null>(null);

  if (!user) {
    return <LoginScreen onLogin={setUser} onExit={onExit} />;
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          onExit={onExit}
          onLogout={() => {
            setUser(null);
            setCurrentView('chat');
          }}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
          userName={user.name}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-100">
        <header className="h-16 border-b border-slate-200 flex items-center px-4 lg:hidden bg-white shrink-0 shadow-sm z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-bold text-slate-900">Rengera {currentView !== 'chat' && `- ${currentView.charAt(0).toUpperCase() + currentView.slice(1)}`}</span>
        </header>

        <header className="hidden border-b border-slate-200 bg-white px-6 py-4 lg:block">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Sparkles size={14} className="text-emerald-600" />
                Prototype control center
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-950">
                {currentView === 'chat' ? 'AI Legal Assistant' : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              <ShieldAlert size={16} />
              Emergency routing enabled
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {PRIORITY_IMPLEMENTATION_MAP.slice(0, 4).map(item => (
              <div key={item.area} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">{item.priority}</span>
                  <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{item.area}</p>
              </div>
            ))}
          </div>
        </header>
        
        <main className="flex-1 relative overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'chat' && <ChatInterface />}
              {currentView === 'library' && <LawLibrary />}
              {currentView === 'complaints' && <Complaints />}
              {currentView === 'emergency' && <Emergency />}
              {currentView === 'business' && <BusinessDashboard />}
              {currentView === 'admin' && <AdminDashboard />}
              {currentView === 'settings' && (
                <div className="p-6 md:p-8">
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-950">Implementation Map</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        This is the build order for turning the prototype into a trustworthy legal literacy product.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {PRIORITY_IMPLEMENTATION_MAP.map(item => (
                        <div key={item.area} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="rounded bg-slate-950 px-2 py-1 text-xs font-bold text-white">{item.priority}</span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.status}</span>
                          </div>
                          <h3 className="font-bold text-slate-950">{item.area}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {currentView === 'bookmarks' && (
                <div className="p-8 h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                   <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                     <span className="text-2xl text-slate-500 capitalize">{currentView[0]}</span>
                   </div>
                   <h2 className="text-2xl font-bold text-slate-900 mb-2 capitalize">{currentView}</h2>
                   <p className="text-slate-500">This section is currently under development as we scale our legal knowledge engine. Check back soon for updates.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
