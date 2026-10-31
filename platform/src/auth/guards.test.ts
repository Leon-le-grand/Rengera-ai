import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import type { AuthController, AuthSnapshot } from './types';
import {
  requireAnyCapability,
  requireAuthenticated,
  requireCapability,
} from './guards';

function controllerFor(snapshot: AuthSnapshot): AuthController {
  return {
    getSnapshot: () => snapshot,
    ensureSession: async () => snapshot,
    refresh: async () => snapshot,
    login: async () => ({ ok: false }),
    logout: async () => ({ ok: true }),
  };
}

const base: AuthSnapshot = {
  status: 'authenticated',
  user: {
    id: 'user-1',
    email: 'staff@example.rw',
    display_name: 'Test Staff',
    role: 'staff',
    status: 'active',
  },
  capabilities: ['staff.access'],
  policyVersion: 'v1',
  error: null,
  refreshing: false,
  lastCheckedAt: new Date().toISOString(),
};

const location = { href: '/settings?tab=account#top' };

function captureRedirect(run: () => Promise<unknown>): Promise<unknown> {
  return run().catch((error: unknown) => error);
}

describe('requireAuthenticated', () => {
  it('redirects anonymous visitors to login with a return path', async () => {
    const redirect = await captureRedirect(() =>
      requireAuthenticated(
        controllerFor({ ...base, status: 'anonymous', user: null, capabilities: [] }),
        location,
      ),
    );

    expect(isRedirect(redirect)).toBe(true);
    if (!isRedirect(redirect)) return;
    expect(redirect.options.to).toBe('/login');
    expect(redirect.options.replace).toBe(true);
    expect(redirect.options.search).toEqual({
      redirect: '/settings?tab=account#top',
    });
  });

  it('returns an unavailable context instead of pretending the user is anonymous', async () => {
    const context = await requireAuthenticated(
      controllerFor({
        ...base,
        status: 'unavailable',
        user: null,
        capabilities: [],
        error: { kind: 'network', message: 'Offline', requestId: null },
      }),
      location,
    );

    expect(context.authUnavailable).toBe(true);
    expect(context.authMessage).toBe('Offline');
    expect(context.session).toBeNull();
  });

  it('redirects a suspended account to 403', async () => {
    const redirect = await captureRedirect(() =>
      requireAuthenticated(
        controllerFor({
          ...base,
          user: { ...base.user!, status: 'suspended' },
        }),
        location,
      ),
    );

    expect(isRedirect(redirect)).toBe(true);
    if (isRedirect(redirect)) {
      expect(redirect.options.to).toBe('/403');
    }
  });

  it('accepts an active verified session', async () => {
    const context = await requireAuthenticated(controllerFor(base), location);

    expect(context.authUnavailable).toBe(false);
    expect(context.session?.user?.id).toBe('user-1');
  });
});

describe('requireCapability', () => {
  it('redirects when the capability is absent', async () => {
    const redirect = await captureRedirect(() =>
      requireCapability(controllerFor(base), location, 'admin.access'),
    );

    expect(isRedirect(redirect)).toBe(true);
    if (isRedirect(redirect)) {
      expect(redirect.options.to).toBe('/403');
    }
  });

  it('accepts when the capability is present', async () => {
    const context = await requireCapability(
      controllerFor(base),
      location,
      'staff.access',
    );

    expect(context.session?.capabilities).toContain('staff.access');
  });

  it('accepts any matching capability', async () => {
    const context = await requireAnyCapability(
      controllerFor(base),
      location,
      ['admin.access', 'staff.access'],
    );

    expect(context.session?.user?.id).toBe('user-1');
  });
});
