import { useEffect, useRef, type MouseEventHandler, type ReactNode } from 'react';
import gsap from 'gsap';

import { Button } from '@/components/ui/button';
import { ArrowUpRight } from './icons';

interface GlossyButtonProps {
  as?: 'a' | 'button';
  tone?: 'light' | 'dark';
  orb?: ReactNode;
  className?: string;
  children?: ReactNode;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
}

export default function GlossyButton({
  as = 'a',
  tone = 'dark',
  orb = <ArrowUpRight />,
  className = '',
  children,
  href,
  type = 'button',
  disabled,
  onClick,
}: GlossyButtonProps) {
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = labelRef.current?.parentElement;
    if (!target) return;
    const media = gsap.matchMedia();
    media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const x = gsap.quickTo(target, '--glossy-x', { duration: 0.45, ease: 'power3' });
      const y = gsap.quickTo(target, '--glossy-y', { duration: 0.45, ease: 'power3' });
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || target.matches(':disabled')) return;
        const bounds = target.getBoundingClientRect();
        x(gsap.utils.clamp(-4, 4, (event.clientX - bounds.left - bounds.width / 2) * 0.08));
        y(gsap.utils.clamp(-3, 3, (event.clientY - bounds.top - bounds.height / 2) * 0.12));
      };
      const reset = () => { x(0); y(0); };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerleave', reset);
      return () => {
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerleave', reset);
        x.tween.kill();
        y.tween.kill();
        target.style.removeProperty('--glossy-x');
        target.style.removeProperty('--glossy-y');
      };
    });
    return () => media.revert();
  }, []);

  const classes = `glossy-button glossy-button--${tone} ${className}`;
  const content = (
    <>
      <span ref={labelRef} className="glossy-button__label">{children}</span>
      <span className="glossy-button__orb" aria-hidden="true">{orb}</span>
    </>
  );

  if (as === 'a') {
    return <Button asChild className={classes}><a href={href} onClick={onClick}>{content}</a></Button>;
  }

  return <Button className={classes} type={type} disabled={disabled} onClick={onClick}>{content}</Button>;
}
