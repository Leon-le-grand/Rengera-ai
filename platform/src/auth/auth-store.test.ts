import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthStore } from './auth-store';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

function authenticatedBody(id: string, capabilities: string[] = []) {
  return {
    data: {
      authenticated: true,
      user: {
        id,
        email: `${id}@example.rw`,
        display_name: `User ${id}`,
        role: capabilities.includes('admin.access') ? 'admin' : 'user',
        status: 'active',
      },
      capabilities,
      policy_version: 'v1',
    },
  };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const store = createAuthStore(queryClient);
  return { queryClient, store };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createAuthStore', () => {
  it('resolves anonymous only when the server says there is no session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ authenticated: false, user: null, capabilities: [] }),
      ),
    );
    const { store } = setup();

    const snapshot = await store.ensureSession();

    expect(snapshot.status).toBe('anonymous');
    expect(snapshot.user).toBeNull();
  });

  it('clears cached private data when an account signs in', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ authenticated: false, user: null, capabilities: [] }),
      )
      .mockResolvedValueOnce(jsonResponse(authenticatedBody('a1')));
    vi.stubGlobal('fetch', fetchMock);

    const { queryClient, store } = setup();
    queryClient.setQueryData(['private', 'a1', 'me'], { secret: true });
    queryClient.setQueryData(['laws', 'list'], { items: [] });

    await store.ensureSession();
    const result = await store.login({
      email: 'a1@example.rw',
      password: 'secret',
    });

    expect(result).toMatchObject({ ok: true, serverConfirmed: true });
    expect(store.getSnapshot().status).toBe('authenticated');
    expect(store.getSnapshot().user?.id).toBe('a1');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('clears the cache on sign-out and returns to anonymous', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(authenticatedBody('a1')))
      .mockResolvedValueOnce(jsonResponse(undefined, 204));
    vi.stubGlobal('fetch', fetchMock);

    const { queryClient, store } = setup();
    await store.ensureSession();
    queryClient.setQueryData(['private', 'a1', 'me'], { secret: true });

    const result = await store.logout();

    expect(result).toMatchObject({ ok: true, serverConfirmed: true });
    expect(store.getSnapshot().status).toBe('anonymous');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('does not authenticate on a malformed login response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ authenticated: false, user: null, capabilities: [] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ authenticated: true, user: null, capabilities: [] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ authenticated: false, user: null, capabilities: [] }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { store } = setup();
    await store.ensureSession();

    const result = await store.login({
      email: 'a1@example.rw',
      password: 'secret',
    });

    expect(result.ok).toBe(false);
    expect(store.getSnapshot().status).toBe('anonymous');
    expect(store.getSnapshot().user).toBeNull();
  });

  it('clears queries when a refresh resolves a different verified identity', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(authenticatedBody('a1')))
      .mockResolvedValueOnce(jsonResponse(authenticatedBody('b2')));
    vi.stubGlobal('fetch', fetchMock);

    const { queryClient, store } = setup();
    await store.ensureSession();
    queryClient.setQueryData(['private', 'a1', 'me'], { secret: true });
    queryClient.setQueryData(['laws', 'detail', 'law-1'], { title: 'Law' });

    const snapshot = await store.refresh();

    expect(snapshot.user?.id).toBe('b2');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
