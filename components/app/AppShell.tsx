'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import LandingPage from '@/components/landing/LandingPage';
import AppDashboard, { type DashboardProps } from './AppDashboard';
import LoginScreen from './LoginScreen';
import { logoutAdmin } from '@/app/auth-actions';
import type { AppView } from './Sidebar';

type AppShellView = 'landing' | 'app' | 'login';

type AdminUser = DashboardProps['adminUser'];
type AccountUser = DashboardProps['accountUser'];

interface AppShellProps {
  initialAdmin: AdminUser;
  initialAccount: AccountUser;
}

export default function AppShell({ initialAdmin, initialAccount }: AppShellProps) {
  const [currentView, setCurrentView] = useState<AppShellView>(
    initialAdmin || initialAccount ? 'app' : 'landing',
  );
  const [adminUser, setAdminUser] = useState<AdminUser>(initialAdmin);
  const [accountUser, setAccountUser] = useState<AccountUser>(initialAccount);

  const openApp = () => setCurrentView('app');
  const openLogin = () => setCurrentView('login');
  const returnHome = () => setCurrentView('landing');

  const handleLogin = (user: NonNullable<AdminUser>) => {
    setAdminUser(user);
    setAccountUser({ id: null, name: user.name, email: user.email, role: 'admin' });
    setCurrentView('app');
  };

  const handleAccount = (account: NonNullable<AccountUser>) => {
    // A citizen session must never populate the administrator slot.
    if (account.role === 'admin') {
      setAdminUser({ name: account.name, email: account.email, role: 'admin' });
    } else {
      setAdminUser(null);
    }
    setAccountUser(account);
    setCurrentView('app');
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // Clear the local view even if the network request fails; the server guard remains authoritative.
    } finally {
      setAdminUser(null);
      setAccountUser(null);
      setCurrentView('app');
    }
  };

  const initialDashboardView: AppView = adminUser ? 'admin' : 'chat';

  return (
    <main className="min-h-dvh overflow-hidden">
      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <LandingPage onEnterApp={openApp} onLogin={openLogin} onStartFree={openLogin} />
          </motion.div>
        ) : currentView === 'login' ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <LoginScreen onLogin={handleLogin} onAccount={handleAccount} onExit={returnHome} />
          </motion.div>
        ) : (
          <motion.div
            key={`app-${adminUser ? 'admin' : accountUser ? 'member' : 'public'}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="h-dvh"
          >
            <AppDashboard
              adminUser={adminUser}
              accountUser={accountUser}
              initialView={initialDashboardView}
              onLogin={openLogin}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
