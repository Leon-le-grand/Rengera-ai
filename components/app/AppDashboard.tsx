'use client';
import { useState } from 'react';
import Sidebar, { type AppView } from './Sidebar';
import ChatInterface from './ChatInterface';
import LawLibrary from './LawLibrary';
import Complaints from './Complaints';
import Emergency from './Emergency';
import BusinessDashboard from './BusinessDashboard';
import AdminDashboard from './AdminDashboard';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DashboardAdminUser {
  name: string;
  email: string;
  role: 'admin';
}

export interface DashboardProps {
  adminUser: DashboardAdminUser | null;
  initialView: AppView;
  onLogin: () => void;
  onLogout: () => Promise<void>;
}

export default function AppDashboard({
  adminUser,
  initialView,
  onLogin,
  onLogout,
}: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(initialView);
  const isAdmin = adminUser?.role === 'admin';

  return (
    <div className="flex h-dvh bg-slate-100">
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
          onLogout={onLogout}
          onLogin={onLogin}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
          userName={adminUser?.name || ''}
          isAdmin={isAdmin}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-dvh overflow-hidden relative bg-slate-100">
        <header className="h-16 border-b border-slate-200 flex items-center px-4 lg:hidden bg-white shrink-0 shadow-sm z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-bold text-slate-900">Rengera {currentView !== 'chat' && `- ${currentView.charAt(0).toUpperCase() + currentView.slice(1)}`}</span>
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
              {currentView === 'admin' && isAdmin && <AdminDashboard />}
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
