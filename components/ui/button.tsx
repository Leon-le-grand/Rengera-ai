'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'gold' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  gold: 'bg-[#d8b485] text-zinc-950 hover:bg-[#c2a277]',
  outline: 'border border-white/15 text-white hover:border-[#d8b485] hover:text-[#d8b485]',
  ghost: 'text-zinc-500 hover:bg-white/5 hover:text-white',
  danger: 'border border-red-500/30 text-red-400 hover:border-red-500/60 hover:text-red-300',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[10px]',
  md: 'px-4 py-2.5 text-[11px]',
  lg: 'px-6 py-4 text-[10px]',
};

/**
 * One button for the whole app. The variants are the two colours the brand
 * actually uses — gold and hairline white — plus a muted danger, so no screen
 * has to invent its own button styling.
 */
export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = 'gold', size = 'md', type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'aura-lift inline-flex items-center justify-center font-bold uppercase tracking-widest transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});