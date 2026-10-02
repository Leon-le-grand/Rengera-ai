'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait before animating. Use this to stagger siblings. */
  delay?: number;
  direction?: RevealDirection;
  duration?: number;
  className?: string;
  /** Fraction of the element that must be visible before it animates. */
  amount?: number;
}

const OFFSETS: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-triggered entrance used across the landing page. Motion's
 * whileInView replaces the previous pattern of animating on mount, which fired
 * before the section was on screen and finished invisibly.
 */
export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.7,
  className,
  amount = 0.25,
}: RevealProps) {
  const offset = OFFSETS[direction];

  const variants: Variants = {
    hidden: { opacity: 0, x: offset.x, y: offset.y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

/** Parent that staggers its Reveal-styled children. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{ visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

/** Child of RevealGroup. Must be a direct motion element. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const variants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}