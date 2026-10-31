import type { QueryClient } from '@tanstack/react-query';

import {
  apiFetch,
  isApiError,
  setCsrfToken,
  setUnauthorizedHandler,
} from '@/api/client';
import { describeApiError } from '@/api/errors';
import { asRecord } from '@/api/parse-utils';
import { PRIVATE_QUERY_ROOT } from '@/api/query-keys';

import {
  anonymousSnapshot,
  parseSessionPayload,
  unavailableSnapshot,
} from './session';
import type {
  AuthActionResult,
  AuthController,
  AuthSnapshot,
  LoginCredentials,
  ParsedSession,
} from './types';

const INITIAL_SNAPSHOT: AuthSnapshot = {
  status: 'loading',
  user: null,
  capabilities: [],
  policyVersion: null,
  error: null,
  refreshing: false,
  lastCheckedAt: null,
};

export interface AuthStore extends AuthController {
  subscribe: (listener: () => void) => () => void;
}

function sameCapabilities(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

function loginFailureMessage(error: unknown): {
  message: string;
  requestId: string | null;
} {
  if (!isApiError(error)) {
    return {
      message:
        'Sign-in could not be completed. Check your connection and try again.',
      requestId: null,
    };
  }

  if (error.status === 401) {
    return {
      message: 'The email or password was not accepted.',
      requestId: error.requestId,
    };
  }

  if (error.status === 403) {
    return {
      message: 'This account is not allowed to sign in.',
      requestId: error.requestId,
    };
  }

  if (error.status === 404 || error.status === 501) {
    return {
      message:
        'Sign-in is not available in this build. You can still use the law library and emergency page.',
      requestId: error.requestId,
    };
  }

  if (error.status === 422) {
    return {
      message: 'Check the email address and password, then try again.',
      requestId: error.requestId,
    };
  }

  if (error.status === 429) {
    return {
      message: 'Too many sign-in attempts. Wait a moment and try again.',
      requestId: error.requestId,
    };
  }

  if (error.isUnavailable) {
    return {
      message:
        'Could not reach the account service. Check your connection and try again.',
      requestId: error.requestId,
    };
  }

  if (error.isServerError) {
    return {
      message: 'The account service is temporarily unavailable.',
      requestId: error.requestId,
    };
  }

  return {
    message: error.message || 'Sign-in could not be completed.',
    requestId: error.requestId,
  };
}

function isRecordWithContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return asRecord(value) !== null;
}

/**
 * Framework-agnostic auth controller.
 *
 * It lives outside React so route guards can resolve a session before a
 * protected layout renders. `AuthProvider` subscribes to it with
 * `useSyncExternalStore`.
 *
 * Invariants:
 * - only a verified server response with an account identity becomes
 *   `authenticated`;
 * - a failed session check becomes `unavailable`, never anonymous;
 * - private cached data is dropped when the verified identity changes.
 */
export function createAuthStore(queryClient: QueryClient): AuthStore {
  let snapshot: AuthSnapshot = INITIAL_SNAPSHOT;
  let bootstrap: Promise<AuthSnapshot> | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const commit = (next: AuthSnapshot) => {
    const previous = snapshot;

    if (previous.status === 'authenticated') {
      const identityChanged =
        next.status !== 'authenticated' || previous.user?.id !== next.user?.id;

      if (identityChanged) {
        // Drop cached server state so a late response from the previous account
        // cannot populate the next account's cache.
        void queryClient.cancelQueries();
        queryClient.clear();
      } else if (
        next.status === 'authenticated' &&
        !sameCapabilities(previous.capabilities, next.capabilities)
      ) {
        void queryClient.cancelQueries();
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] === PRIVATE_QUERY_ROOT,
        });
      }
    }

    snapshot = next;
    emit();
  };

  const applySession = (parsed: ParsedSession): AuthSnapshot => {
    setCsrfToken(parsed.csrfToken);
    commit(parsed.snapshot);
    return parsed.snapshot;
  };

  const fetchSession = async (): Promise<AuthSnapshot> => {
    try {
      const payload = await apiFetch<unknown>('/v1/session', {
        skipUnauthorizedHandler: true,
        timeoutMs: 15_000,
      });
      return applySession(parseSessionPayload(payload));
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setCsrfToken(null);
        const next = anonymousSnapshot();
        commit(next);
        return next;
      }

      const friendly = describeApiError(error, 'session');
      const notImplemented =
        isApiError(error) && (error.status === 404 || error.status === 501);
      const next = unavailableSnapshot(
        notImplemented
          ? 'The account service is not available in this build. Public pages still work without an account.'
          : friendly.message,
        {
          kind:
            isApiError(error) && error.kind === 'network' ? 'network' : 'server',
          requestId: isApiError(error) ? error.requestId : null,
        },
      );
      commit(next);
      return next;
    }
  };

  const ensureSession = (): Promise<AuthSnapshot> => {
    if (snapshot.status !== 'loading') {
      return Promise.resolve(snapshot);
    }

    if (!bootstrap) {
      bootstrap = fetchSession();
    }
    return bootstrap;
  };

  const refresh = async (): Promise<AuthSnapshot> => {
    const current = snapshot;
    if (current.status === 'loading') {
      return ensureSession();
    }

    commit({
      ...current,
      refreshing: true,
      error: null,
    });
    return fetchSession();
  };

  const login = async (
    credentials: LoginCredentials,
  ): Promise<AuthActionResult> => {
    try {
      const payload = await apiFetch<unknown>('/v1/session', {
        method: 'POST',
        body: credentials,
        skipUnauthorizedHandler: true,
        timeoutMs: 15_000,
      });

      if (isRecordWithContent(payload)) {
        const parsed = parseSessionPayload(payload);
        if (parsed.snapshot.status === 'authenticated') {
          setCsrfToken(parsed.csrfToken);
          queryClient.clear();
          commit(parsed.snapshot);
          return { ok: true, serverConfirmed: true };
        }
      }

      // Cookie-only sign-in implementations may return 204 or only a minimal
      // acknowledgement. Resolve the authoritative session once.
      const refreshed = await fetchSession();
      if (refreshed.status === 'authenticated') {
        queryClient.clear();
        return { ok: true, serverConfirmed: true };
      }

      return {
        ok: false,
        message:
          refreshed.status === 'unavailable'
            ? (refreshed.error?.message ??
              'The account service could not verify the new session.')
            : 'The account service did not start a verified session. Check your credentials and try again.',
        requestId: refreshed.error?.requestId ?? null,
      };
    } catch (error) {
      const failure = loginFailureMessage(error);
      return {
        ok: false,
        message: failure.message,
        requestId: failure.requestId,
      };
    }
  };

  const logout = async (): Promise<AuthActionResult> => {
    let serverConfirmed = false;

    try {
      await apiFetch<unknown>('/v1/session', {
        method: 'DELETE',
        skipUnauthorizedHandler: true,
        timeoutMs: 10_000,
      });
      serverConfirmed = true;
    } catch (error) {
      if (
        isApiError(error) &&
        (error.status === 401 || error.status === 404 || error.status === 501)
      ) {
        // Already signed out, or the build has no logout endpoint. Local state
        // is still cleared below.
        serverConfirmed = error.status === 401;
      }
    } finally {
      setCsrfToken(null);
      void queryClient.cancelQueries();
      queryClient.clear();
      snapshot = anonymousSnapshot();
      emit();
    }

    return {
      ok: true,
      serverConfirmed,
      message: serverConfirmed
        ? undefined
        : 'Signed out on this device. The server could not confirm the sign-out.',
    };
  };

  setUnauthorizedHandler(() => {
    void refresh();
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ensureSession,
    refresh,
    login,
    logout,
  };
}
