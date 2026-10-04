'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * One input for the whole app. Behaviour is shadcn's — a visible focus ring,
 * disabled state, no double borders — while the colours come from the product
 * tokens, so it reads correctly in both themes.
 */
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full border bg-transparent px-3 py-2.5 text-sm outline-none transition-colors',
        'border-slate-200 text-slate-900 placeholder:text-slate-400',
        'focus:border-[#d8b485] focus:ring-2 focus:ring-[#d8b485]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full resize-none border bg-transparent px-3 py-2.5 text-sm outline-none transition-colors',
        'border-slate-200 text-slate-900 placeholder:text-slate-400',
        'focus:border-[#d8b485] focus:ring-2 focus:ring-[#d8b485]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});