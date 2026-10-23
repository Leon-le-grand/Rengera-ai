'use client';

import { cn } from '@/lib/utils';

/**
 * shadcn-style primitives.
 *
 * These are deliberately design-neutral: they carry structure and behaviour
 * (skeleton shimmer, input focus ring, button states) and nothing visual beyond
 * the tokens already defined in globals.css. That way the landing page, the
 * chat and the dashboards can share one set of building blocks without the
 * design drifting apart.
 */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-current/10', className)}
      {...props}
    />
  );
}

/** A card-shaped placeholder block used while a view is loading. */
export function SkeletonCard({
  lines = 3,
  className,
  media,
}: {
  lines?: number;
  className?: string;
  media?: boolean;
}) {
  return (
    <div className={cn('border border-slate-200 bg-white p-5', className)}>
      {media && <Skeleton className="mb-4 h-40 w-full" />}
      <Skeleton className="mb-2 h-3 w-1/3" />
      <Skeleton className="mb-4 h-5 w-2/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="mb-2 h-3 w-full" />
      ))}
    </div>
  );
}

/** A row of skeletons shaped like the sidebar navigation. */
export function SkeletonNav({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}