'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export interface RotatingTextProps {
  /** Static text before the rotating word, e.g. "Not". */
  prefix?: string;
  /** Words that rotate. The first is shown immediately. */
  texts: string[];
  className?: string;
  style?: CSSProperties;
  /** Colour of the rotating word. */
  accent?: string;
  prefixColor?: string;
  badgeBackground?: string;
  intervalMs?: number;
  duration?: number;
  stagger?: number;
}

/**
 * Rotates one word at a time, per character.
 *
 * The upstream version drives this with GSAP. This project already ships
 * `motion`, so the same choreography is expressed with AnimatePresence and a
 * per-character stagger instead. That avoids adding an animation library just
 * for one headline while keeping the exact slide-and-fade behaviour.
 */
export default function RotatingText({
  prefix,
  texts,
  className,
  style,
  accent = '#059669',
  prefixColor,
  badgeBackground,
  intervalMs = 2200,
  duration = 0.4,
  stagger = 0.035,
}: RotatingTextProps) {
  const safeTexts = texts.length > 0 ? texts : ['minutes'];
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const timer = useRef<number | null>(null);

  const characters = useMemo(
    () => Array.from(safeTexts[index % safeTexts.length] ?? ''),
    [safeTexts, index],
  );

  useEffect(() => {
    if (safeTexts.length <= 1) return;

    timer.current = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeTexts.length);
    }, intervalMs);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [safeTexts.length, intervalMs]);

  const current = safeTexts[index % safeTexts.length];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.5rem',
        flexWrap: 'wrap',
        verticalAlign: 'bottom',
        ...style,
      }}
    >
      {prefix ? (
        <span style={{ color: prefixColor, whiteSpace: 'pre' }}>{prefix}</span>
      ) : null}

      {/* Fixed width slot stops the headline reflowing on every swap. */}
      <span
        style={{
          position: 'relative',
          display: 'inline-grid',
          verticalAlign: 'bottom',
          overflow: 'hidden',
          borderRadius: badgeBackground ? '0.6rem' : undefined,
          padding: badgeBackground ? '0 0.6rem' : undefined,
          backgroundColor: badgeBackground,
        }}
      >
        {/* Screen readers get one stable sentence instead of a jumble of spans. */}
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          {prefix ? `${prefix} ` : ''}
          {safeTexts.join(', ')}
        </span>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current}
            aria-hidden="true"
            initial={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'inline-flex',
              whiteSpace: 'nowrap',
              color: accent,
              fontWeight: 'inherit',
            }}
          >
            {characters.map((character, position) => (
              <motion.span
                key={`${current}-${position}`}
                initial={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
                animate={reducedMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                transition={{
                  duration,
                  delay: reducedMotion ? 0 : position * stagger,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ display: 'inline-block', willChange: 'transform, opacity' }}
              >
                {character === ' ' ? '\u00A0' : character}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}