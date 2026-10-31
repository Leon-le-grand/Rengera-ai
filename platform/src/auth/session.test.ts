import { afterEach, describe, expect, it } from 'vitest';

import { parseSessionPayload } from './session';

afterEach(() => {
  document.cookie = 'rengera_csrf=; Max-Age=0; path=/';
});

describe('parseSessionPayload', () => {
  it('parses a verified session with capabilities', () => {
    const { snapshot, csrfToken } = parseSessionPayload({
      data: {
        authenticated: true,
        user: {
          id: 'user-1',
          email: 'staff@example.rw',
          display_name: 'Test Staff',
          role: 'staff',
          status: 'active',
        },
        capabilities: ['staff.access'],
        policy_version: '2026-01',
        csrf_token: 'csrf-123',
      },
    });

    expect(snapshot.status).toBe('authenticated');
    expect(snapshot.user).toMatchObject({
      id: 'user-1',
      display_name: 'Test Staff',
      role: 'staff',
      status: 'active',
    });
    expect(snapshot.capabilities).toEqual(['staff.access']);
    expect(snapshot.policyVersion).toBe('2026-01');
    expect(csrfToken).toBe('csrf-123');
  });

  it('recovers the CSRF token from the readable cookie after a reload', () => {
    document.cookie = 'rengera_csrf=cookie-token; path=/';

    const { snapshot, csrfToken } = parseSessionPayload({
      authenticated: true,
      account: {
        id: 'account-1',
        email: 'person@example.rw',
        role: 'user',
        status: 'active',
      },
      capabilities: ['law.read'],
      csrf_token: null,
    });

    expect(snapshot.status).toBe('authenticated');
    expect(snapshot.user?.id).toBe('account-1');
    expect(snapshot.capabilities).toEqual(['law.read']);
    expect(csrfToken).toBe('cookie-token');
  });

  it('treats a response without an identity as anonymous', () => {
    const { snapshot } = parseSessionPayload({
      authenticated: false,
      user: null,
      capabilities: [],
    });

    expect(snapshot.status).toBe('anonymous');
    expect(snapshot.user).toBeNull();
    expect(snapshot.capabilities).toEqual([]);
  });

  it('never fabricates a session when the flag says authenticated but no user exists', () => {
    const { snapshot } = parseSessionPayload({
      authenticated: true,
      user: null,
    });

    expect(snapshot.status).toBe('unavailable');
    expect(snapshot.error?.kind).toBe('protocol');
  });

  it('rejects an account without a verified identifier', () => {
    const { snapshot } = parseSessionPayload({
      authenticated: true,
      user: { email: 'person@example.rw' },
    });

    expect(snapshot.status).toBe('unavailable');
    expect(snapshot.user).toBeNull();
  });

  it('rejects unreadable payloads', () => {
    const { snapshot } = parseSessionPayload('not-json');

    expect(snapshot.status).toBe('unavailable');
    expect(snapshot.error?.kind).toBe('protocol');
  });

  it('normalizes unknown roles and statuses instead of trusting them', () => {
    const { snapshot } = parseSessionPayload({
      authenticated: true,
      user: {
        id: 'user-2',
        role: 'superuser',
        status: 'pending',
      },
      capabilities: ['staff.access', 42, 'admin.access'],
    });

    expect(snapshot.status).toBe('authenticated');
    expect(snapshot.user?.role).toBe('unknown');
    expect(snapshot.user?.status).toBe('unknown');
    expect(snapshot.capabilities).toEqual(['staff.access', 'admin.access']);
  });
});
