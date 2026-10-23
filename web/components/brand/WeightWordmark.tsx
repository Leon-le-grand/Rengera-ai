'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, stagger, useAnimate, type AnimationOptions } from 'motion/react';

/**
 * The footer wordmark.
 *
 * A variable font (Inter Variable, weight axis 100–900) means the weight is a
 * real animated property rather than a fake bold. On hover each letter's weight
 * travels from 300 to 800 in a staggered wave; on leave it travels back. The
 * order can run left-to-right, right-to-left, from the centre, or randomly.
 *
 * Ported from the Originkit "Weight Hover" snippet to this project's animation
 * package (`motion/react`) and kept accessible: the word is exposed once to
 * screen readers and every letter is aria-hidden.
 */

const FONT_FACE = `
@font-face {
  font-family: "InterVariableHover";
  src: url("https://rsms.me/inter/font-files/InterVariable.woff2?v=4.0") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;

const FONT_STACK = '"InterVariableHover", "Inter Variable", var(--font-jakarta), system-ui, sans-serif';

export type StaggerFrom = 'first' | 'last' | 'center' | 'random';

export default function WeightWordmark({
  label = 'RENGERA',
  fromWeight = 300,
  toWeight = 800,
  staggerDuration = 45,
  staggerFrom = 'random',
  className = '',
}: {
  label?: string;
  fromWeight?: number;
  toWeight?: number;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  className?: string;
}) {
  const [scope, animate] = useAnimate();
  const [isStatic, setIsStatic] = useState(false);
  const from = `'wght' ${fromWeight}`;
  const to = `'wght' ${toWeight}`;
  const staggerSec = Math.max(0, staggerDuration) / 1000;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsStatic(media.matches);
  }, []);

  const shuffled = useMemo(() => {
    if (staggerFrom !== 'random') return null;
    const indices = Array.from({ length: label.length }, (_, index) => index);
    for (let index = indices.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [indices[index], indices[swap]] = [indices[swap], indices[index]];
    }
    return indices;
  }, [label, staggerFrom]);

  const transition: AnimationOptions = useMemo(
    () => ({ type: 'spring', duration: 0.7, bounce: 0.2 }),
    [],
  );

  const mergeStagger = (base: AnimationOptions): AnimationOptions => {
    if (staggerFrom === 'random' && shuffled) {
      const indices = shuffled;
      return {
        ...base,
        delay: (index: number) => staggerSec * (indices[index] ?? 0),
      } as AnimationOptions;
    }
    return { ...base, delay: stagger(staggerSec, { from: staggerFrom as 'first' }) } as AnimationOptions;
  };

  // Debounced so flicking the mouse across the word does not restart the wave
  // on every letter.
  const timer = useRef<{ start: ReturnType<typeof setTimeout> | null; end: ReturnType<typeof setTimeout> | null; trailing: boolean }>({
    start: null,
    end: null,
    trailing: false,
  });

  useEffect(() => {
    const state = timer.current;
    return () => {
      if (state.start) clearTimeout(state.start);
      if (state.end) clearTimeout(state.end);
    };
  }, []);

  const run = (settings: string, key: 'start' | 'end') => {
    void animate('.letter', { fontVariationSettings: settings }, mergeStagger(transition));

    if (timer.current[key]) {
      timer.current.trailing = true;
      return;
    }

    timer.current[key] = setTimeout(() => {
      if (timer.current.trailing) void animate('.letter', { fontVariationSettings: settings }, mergeStagger(transition));
      timer.current.trailing = false;
      timer.current[key] = null;
    }, 120);
  };

  const letters = label.split('');

  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => !isStatic && run(to, 'start')}
      onMouseLeave={() => !isStatic && run(from, 'end')}
    >
      <style>{FONT_FACE}</style>
      <span
        ref={scope}
        style={{
          fontFamily: FONT_STACK,
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <span style={srOnly}>{label}</span>
        {letters.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            className="letter"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              fontVariationSettings: from,
            }}
          >
            {letter}
          </motion.span>
        ))}
      </span>
    </div>
  );
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};