import type { ReactNode } from 'react';

import { useAuth } from './AuthProvider';
import { hasAnyCapability, hasCapability } from './capabilities';

type CanProps = {
  children: ReactNode;
  fallback?: ReactNode;
} & (
  | { permission: string; anyOf?: never }
  | { permission?: never; anyOf: readonly string[] }
);

/**
 * Display-only permission gate. It never protects an API operation; the server
 * remains authoritative. While the session is loading or unavailable, it hides
 * sensitive UI rather than optimistically showing it.
 */
export function Can({ permission, anyOf, fallback = null, children }: CanProps) {
  const { status, capabilities } = useAuth();

  if (status !== 'authenticated') return <>{fallback}</>;

  const allowed =
    permission !== undefined
      ? hasCapability(capabilities, permission)
      : hasAnyCapability(capabilities, anyOf);

  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function useCan(permission: string): boolean {
  const { status, capabilities } = useAuth();
  return status === 'authenticated' && hasCapability(capabilities, permission);
}

export function useCanAny(permissions: readonly string[]): boolean {
  const { status, capabilities } = useAuth();
  return status === 'authenticated' && hasAnyCapability(capabilities, permissions);
}
