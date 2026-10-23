'use client';

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useAnimate, useReducedMotion } from 'motion/react';

const radiusFromPercent = (width: number, height: number, percent: number) =>
  (Math.min(width, height) / 2) * (Math.max(0, Math.min(100, percent)) / 100);

export interface RadialButtonProps {
  children: ReactNode;
  className?: string;
  /** Corner rounding as a percentage of the shorter side. 100 is a pill. */
  rounded?: number;
  fill?: string;
  hoverFill?: string;
  textColor?: string;
  hoverTextColor?: string;
  borderWidth?: number;
  borderColor?: string;
  padding?: string;
  duration?: number;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * A circular wipe that grows from the pointer on hover. Implemented with
 * motion's `useAnimate` rather than framer-motion, because this project
 * already depends on `motion` and adding a second animation library for one
 * component is not worth the bundle and lockfile cost.
 */
export default function RadialRevealButton({
  children,
  className,
  rounded = 100,
  fill = '#059669',
  hoverFill = '#0f172a',
  textColor = '#ffffff',
  hoverTextColor = '#ffffff',
  borderWidth = 0,
  borderColor = 'transparent',
  padding = '1rem 2rem',
  duration = 0.45,
  onClick,
  ariaLabel,
}: RadialButtonProps) {
  const [scope, animate] = useAnimate();
  const overlayRef = useRef<HTMLSpanElement>(null);
  const clipControl = useRef<{ stop: () => void } | null>(null);
  const reducedMotion = useReducedMotion();
  const [box, setBox] = useState({ width: 0, height: 0 });

  const clip = useRef({ radius: 0, x: 100, y: 100, max: 160 });

  useLayoutEffect(() => {
    const element = scope.current as HTMLElement | null;
    if (!element) return;

    const read = () =>
      setBox((previous) =>
        previous.width === element.offsetWidth && previous.height === element.offsetHeight
          ? previous
          : { width: element.offsetWidth, height: element.offsetHeight },
      );

    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scope]);

  const radius = radiusFromPercent(box.width, box.height, rounded);

  const applyClip = () => {
    const element = overlayRef.current;
    if (!element) return;
    const { radius: r, x, y } = clip.current;
    const value = `circle(${r}% at ${x}% ${y}%)`;
    element.style.clipPath = value;
    (element.style as unknown as { webkitClipPath: string }).webkitClipPath = value;
  };

  const anchorTo = (event: PointerEvent<HTMLSpanElement>) => {
    const element = overlayRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const unit = Math.hypot(rect.width, rect.height) / Math.SQRT2;
    const far = Math.max(
      Math.hypot(px, py),
      Math.hypot(rect.width - px, py),
      Math.hypot(px, rect.height - py),
      Math.hypot(rect.width - px, rect.height - py),
    );

    clip.current.x = (px / rect.width) * 100;
    clip.current.y = (py / rect.height) * 100;
    clip.current.max = (far / unit) * 100 + 2;
  };

  const growTo = (to: number) => {
    clipControl.current?.stop();

    if (reducedMotion) {
      clip.current.radius = to;
      applyClip();
      return;
    }

    const controls = animate(clip.current.radius, to, {
      duration,
      ease: 'easeInOut',
      onUpdate: (value: number) => {
        clip.current.radius = value;
        applyClip();
      },
    });

    clipControl.current = { stop: () => controls.stop() };
  };

  const onEnter = (event: PointerEvent<HTMLSpanElement>) => {
    anchorTo(event);
    applyClip();
    growTo(clip.current.max);
  };

  const onLeave = (event: PointerEvent<HTMLSpanElement>) => {
    if (clip.current.radius >= clip.current.max - 0.5) {
      anchorTo(event);
      clip.current.radius = clip.current.max;
      applyClip();
    }
    growTo(0);
  };

  useIsoLayoutEffect(() => {
    applyClip();
    return () => clipControl.current?.stop();
  }, []);

  return (
    <button
      type="button"
      ref={scope}
      onClick={onClick}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      aria-label={ariaLabel}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        isolation: 'isolate',
        boxSizing: 'border-box',
        userSelect: 'none',
        cursor: 'pointer',
        borderRadius: radius,
        borderWidth,
        borderStyle: borderWidth ? 'solid' : undefined,
        borderColor,
        backgroundColor: fill,
        color: textColor,
        padding,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          whiteSpace: 'nowrap',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </span>

      <span
        ref={overlayRef}
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          whiteSpace: 'nowrap',
          position: 'absolute',
          inset: 0,
          backgroundColor: hoverFill,
          color: hoverTextColor,
          pointerEvents: 'none',
          borderRadius: radius,
          clipPath: 'circle(0% at 100% 100%)',
          WebkitClipPath: 'circle(0% at 100% 100%)',
        }}
      >
        {children}
      </span>
    </button>
  );
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;