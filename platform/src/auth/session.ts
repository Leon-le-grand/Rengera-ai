import type { AccountRole, AccountStatus } from '@/api/types';
import {
  asBoolean,
  asRecord,
  asString,
  asStringArray,
  unwrapData,
} from '@/api/parse-utils';

import type { AuthSnapshot, ParsedSession } from './types';

const ROLES: readonly AccountRole[] = ['user', 'staff', 'admin', 'unknown'];
const STATUSES: readonly AccountStatus[] = [
  'active',
  'invited',
  'suspended',
  'unknown',
];

const DEFAULT_CSRF_COOKIE = 'rengera_csrf';

/**
 * The API sets a readable double-submit CSRF cookie alongside the HttpOnly
 * session cookie. Reading it after a page reload lets the SPA continue unsafe
 * requests without persisting the token in localStorage.
 */
function csrfCookieName(): string {
  const configured = import.meta.env.VITE_CSRF_COOKIE_NAME;
  return typeof configured === 'string' && configured.trim()
    ? configured.trim()
    : DEFAULT_CSRF_COOKIE;
}

export function readCsrfCookie(): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const name = csrfCookieName();
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) continue;
    const value = entry.slice(prefix.length);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export function anonymousSnapshot(
  lastCheckedAt = new Date().toISOString(),
): AuthSnapshot {
  return {
    status: 'anonymous',
    user: null,
    capabilities: [],
    policyVersion: null,
    error: null,
    refreshing: false,
    lastCheckedAt,
  };
}

export function unavailableSnapshot(
  message: string,
  options: {
    kind?: 'network' | 'server' | 'protocol';
    requestId?: string | null;
    lastCheckedAt?: string;
  } = {},
): AuthSnapshot {
  return {
    status: 'unavailable',
    user: null,
    capabilities: [],
    policyVersion: null,
    error: {
      kind: options.kind ?? 'server',
      message,
      requestId: options.requestId ?? null,
    },
    refreshing: false,
    lastCheckedAt: options.lastCheckedAt ?? new Date().toISOString(),
  };
}

function normalizeRole(value: unknown): AccountRole {
  return typeof value === 'string' &&
    (ROLES as readonly string[]).includes(value)
    ? (value as AccountRole)
    : 'unknown';
}

function normalizeStatus(value: unknown): AccountStatus {
  return typeof value === 'string' &&
    (STATUSES as readonly string[]).includes(value)
    ? (value as AccountStatus)
    : 'unknown';
}

/**
 * Parses `GET /v1/session`, `POST /v1/session` and any `{ data: ... }`
 * envelope. A signed-in state is only produced when the server supplies a
 * verified identity. A malformed or contradictory response becomes
 * `unavailable`, never a fabricated session.
 */
export function parseSessionPayload(payload: unknown): ParsedSession {
  const root = asRecord(unwrapData(payload));

  if (!root) {
    return {
      snapshot: unavailableSnapshot(
        'The account service returned a response this build could not read.',
        { kind: 'protocol' },
      ),
      csrfToken: null,
    };
  }

  const authenticatedFlag = asBoolean(
    root.authenticated ?? root.is_authenticated,
  );
  const userRecord = asRecord(root.user) ?? asRecord(root.account);
  const csrfToken = asString(root.csrf_token) ?? readCsrfCookie();

  if (!userRecord) {
    if (authenticatedFlag === true) {
      return {
        snapshot: unavailableSnapshot(
          'The account service reported a session without an account identity.',
          { kind: 'protocol' },
        ),
        csrfToken,
      };
    }

    return {
      snapshot: anonymousSnapshot(),
      csrfToken,
    };
  }

  const id =
    asString(userRecord.id) ??
    asString(userRecord.account_id) ??
    asString(root.user_id);

  if (!id) {
    return {
      snapshot: unavailableSnapshot(
        'The account service returned an account without a verified identifier.',
        { kind: 'protocol' },
      ),
      csrfToken,
    };
  }

  const email = asString(userRecord.email) ?? '';
  const displayName =
    asString(userRecord.display_name) ??
    asString(userRecord.name) ??
    (email || 'Signed-in account');

  const capabilities = asStringArray(
    root.capabilities ?? userRecord.capabilities,
  );

  const snapshot: AuthSnapshot = {
    status: 'authenticated',
    user: {
      id,
      email,
      display_name: displayName,
      role: normalizeRole(userRecord.role ?? root.role),
      status: normalizeStatus(userRecord.status ?? root.account_status),
    },
    capabilities,
    policyVersion: asString(root.policy_version),
    error: null,
    refreshing: false,
    lastCheckedAt: new Date().toISOString(),
  };

  return { snapshot, csrfToken };
}
