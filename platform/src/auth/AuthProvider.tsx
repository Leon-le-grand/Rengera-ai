import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import type { AuthStore } from './auth-store';
import type { AuthActionResult, AuthSnapshot, LoginCredentials } from './types';

interface AuthContextValue extends AuthSnapshot {
  login: (credentials: LoginCredentials) => Promise<AuthActionResult>;
  logout: () => Promise<AuthActionResult>;
  refresh: () => Promise<AuthSnapshot>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Subscribes React to the framework-agnostic auth store created in
 * `src/app/providers.tsx`. The store is also passed to the router context so
 * route guards can resolve a session before rendering protected layouts.
 */
export function AuthProvider({
  auth,
  children,
}: {
  auth: AuthStore;
  children: ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    auth.subscribe,
    auth.getSnapshot,
    auth.getSnapshot,
  );

  useEffect(() => {
    void auth.ensureSession();
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...snapshot,
      login: auth.login,
      logout: auth.logout,
      refresh: auth.refresh,
    }),
    [snapshot, auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}
