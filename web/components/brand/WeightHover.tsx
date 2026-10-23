'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion, stagger, useAnimate, type AnimationOptions } from 'motion/react';

type StaggerFrom = 'first' | 'last' | 'center' | 'random';

interface WeightHoverProps {
  label?: string;
  fromWeight?: number;
  toWeight?: number;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  fontSize?: number;
  color?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Each letter independently transitions its font weight on hover.
 * Uses the Inter Variable font loaded via CSS @font-face.
 * The upstream version depends on framer-motion; this project ships `motion`,
 * which exports the same API under the same name.
 */
export default function WeightHover({
  label = 'RENGERA',
  fromWeight = 400,
  toWeight = 900,
  staggerDuration = 30,
  staggerFrom = 'random',
  fontSize = 120,
  color = '#ffffff',
  className,
  onClick,
}: WeightHoverProps) {
  const [scope, animate] = useAnimate();
  const staggerSec = Math.max(0, staggerDuration) / 1000;

  const shuffledIndices = useMemo(() => {
    if (staggerFrom !== 'random') return null;
    const indices = Array.from({ length: label.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [label, staggerFrom]);

  const transition: AnimationOptions = { type: 'spring', duration: 0.7, bounce: 0.2 };

  const mergeStagger = (base: AnimationOptions): AnimationOptions => {
    if (staggerFrom === 'random' && shuffledIndices) {
      return {
        ...base,
        delay: (i: number) => staggerSec * (shuffledIndices[i] ?? 0),
      } as AnimationOptions;
    }
    return {
      ...base,
      delay: stagger(staggerSec, { from: staggerFrom as any }),
    } as AnimationOptions;
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const runStart = () => {
      animate(
        '.letter',
        { fontVariationSettings: `'wght' ${toWeight}` },
        mergeStagger(transition),
      );
    };

    const runEnd = () => {
      animate(
        '.letter',
        { fontVariationSettings: `'wght' ${fromWeight}` },
        mergeStagger(transition),
      );
    };

    const handleEnter = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runStart, 50);
    };

    const handleLeave = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runEnd, 50);
    };

    const el = scope.current as HTMLElement | null;
    if (!el) return;

    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [animate, fromWeight, toWeight, mergeStagger, scope]);

  const letters = label.split('');

  return (
    <div
      ref={scope}
      className={className}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <style>{INTER_VARIABLE_FONT_FACE}</style>
      <span
        style={{
          fontFamily: VARIABLE_FONT_STACK,
          fontSize,
          color,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          {label}
        </span>
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="letter"
            aria-hidden
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              fontVariationSettings: `'wght' ${fromWeight}`,
            }}
          >
            {letter}
          </motion.span>
        ))}
      </span>
    </div>
  );
}

const INTER_VARIABLE_FONT_FACE = `
@font-face {
  font-family: "InterVariableRengera";
  src: url("https://rsms.me/inter/font-files/InterVariable.woff2?v=4.0") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "InterVariableRengera";
  src: url("https://rsms.me/inter/font-files/InterVariable-Italic.woff2?v=4.0") format("woff2-variations");
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}
`;

const VARIABLE_FONT_STACK =
  '"InterVariableRengera", "Inter Variable", "Inter", system-ui, sans-serif';