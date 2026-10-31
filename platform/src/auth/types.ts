import type { AccountRole, AccountStatus, SessionUser } from '@/api/types';

export type AuthStatus =
  | 'loading'
  | 'anonymous'
  | 'authenticated'
  | 'unavailable';

export type AuthErrorKind = 'network' | 'server' | 'protocol';

export interface AuthError {
  kind: AuthErrorKind;
  message: string;
  requestId: string | null;
}

export interface AuthSnapshot {
  status: AuthStatus;
  user: SessionUser | null;
  capabilities: string[];
  policyVersion: string | null;
  error: AuthError | null;
  refreshing: boolean;
  lastCheckedAt: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  requestId?: string | null;
  serverConfirmed?: boolean;
}

export interface AuthController {
  getSnapshot: () => AuthSnapshot;
  ensureSession: () => Promise<AuthSnapshot>;
  refresh: () => Promise<AuthSnapshot>;
  login: (credentials: LoginCredentials) => Promise<AuthActionResult>;
  logout: () => Promise<AuthActionResult>;
}

export interface ParsedSession {
  snapshot: AuthSnapshot;
  csrfToken: string | null;
}

export type { AccountRole, AccountStatus, SessionUser };
