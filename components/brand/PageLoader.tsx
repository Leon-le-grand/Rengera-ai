'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

/**
 * Full-screen loader that fades in on mount and fades out once the page is
 * ready. Inspired by the debriefsmith project's approach of showing a branded
 * splash before the main content.
 */
export default function PageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Give the page a moment to paint, then fade out.
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#070A14',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/rengera-logo.jpg"
              alt="RENGERA AI"
              width={80}
              height={80}
              priority
              style={{ objectFit: 'contain' }}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: 24,
              fontFamily: 'var(--font-brand)',
              fontSize: 24,
              letterSpacing: '0.08em',
              color: '#b69d74',
            }}
          >
            RENGERA AI
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: 32,
              width: 120,
              height: 2,
              borderRadius: 1,
              backgroundColor: '#b69d74',
              transformOrigin: 'left',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}