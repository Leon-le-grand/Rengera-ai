'use client';

import { useState } from 'react';
import LandingPage from '@/components/landing/LandingPage';
import AppDashboard from '@/components/app/AppDashboard';
import { AnimatePresence, motion } from 'motion/react';

export default function Page() {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');

  return (
    <main className="min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
          <motion.div 
            key="landing" 
            exit={{ opacity: 0, y: -20 }} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <LandingPage onEnterApp={() => setCurrentView('app')} />
          </motion.div>
        ) : (
          <motion.div 
            key="app" 
            exit={{ opacity: 0, scale: 0.98 }} 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-screen"
          >
            <AppDashboard onExit={() => setCurrentView('landing')} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
