import { redirect } from '@tanstack/react-router';

import { hasAnyCapability, hasCapability } from './capabilities';
import type { AuthController, AuthSnapshot } from './types';

export interface RouteLocationLike {
  href: string;
}

export interface AuthorizedRouteContext {
  authUnavailable: boolean;
  authMessage: string | null;
  session: AuthSnapshot | null;
}

function isUsableSession(
  snapshot: AuthSnapshot,
): snapshot is AuthSnapshot & { user: NonNullable<AuthSnapshot['user']> } {
  return snapshot.status === 'authenticated' && snapshot.user !== null;
}

/**
 * Parent guard for authenticated layouts.
 *
 * - anonymous -> /login with a validated local return path
 * - unavailable -> no redirect (a network failure is not an authentication
 *   failure); the layout renders an honest unavailable state
 * - authenticated but suspended/non-active -> /403
 */
export async function requireAuthenticated(
  auth: AuthController,
  location: RouteLocationLike,
): Promise<AuthorizedRouteContext> {
  const snapshot = await auth.ensureSession();

  if (snapshot.status === 'unavailable') {
    return {
      authUnavailable: true,
      authMessage: snapshot.error?.message ?? null,
      session: null,
    };
  }

  if (!isUsableSession(snapshot)) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
      replace: true,
    });
  }

  if (snapshot.user.status !== 'active' && snapshot.user.status !== 'unknown') {
    throw redirect({ to: '/403', replace: true });
  }

  return {
    authUnavailable: false,
    authMessage: null,
    session: snapshot,
  };
}

export async function requireCapability(
  auth: AuthController,
  location: RouteLocationLike,
  permission: string,
): Promise<AuthorizedRouteContext> {
  const context = await requireAuthenticated(auth, location);
  if (context.authUnavailable || !context.session) return context;

  if (!hasCapability(context.session.capabilities, permission)) {
    throw redirect({ to: '/403', replace: true });
  }

  return context;
}

export async function requireAnyCapability(
  auth: AuthController,
  location: RouteLocationLike,
  permissions: readonly string[],
): Promise<AuthorizedRouteContext> {
  const context = await requireAuthenticated(auth, location);
  if (context.authUnavailable || !context.session) return context;

  if (!hasAnyCapability(context.session.capabilities, permissions)) {
    throw redirect({ to: '/403', replace: true });
  }

  return context;
}
