'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Entrance used across the landing page. It reproduces the "aura-reveal"
 * behaviour of the reference page: sections stay invisible until they enter the
 * viewport, then fade up 24px over 0.8s on a cubic-bezier(.16,1,.3,1) curve.
 */
export default function AuraReveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const MotionTag = motion[Tag] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/** The short gold rule + uppercase label that opens every section. */
export function SectionLabel({
  children,
  className,
  size = 'md',
}: {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className={cn('bg-[#d8b485]', size === 'sm' ? 'h-px w-8' : 'h-px w-12')} />
      <p
        className={cn(
          'font-bold uppercase leading-relaxed tracking-[0.2em] text-[#d8b485]',
          size === 'sm' ? 'text-[10px]' : 'text-[10px]',
        )}
      >
        {children}
      </p>
    </div>
  );
}