import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import type { AuthStore } from './auth-store';
import { AuthProvider } from './AuthProvider';
import { Can, useCan, useCanAny } from './Can';
import type { AuthSnapshot } from './types';

function storeFor(snapshot: AuthSnapshot): AuthStore {
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    ensureSession: async () => snapshot,
    refresh: async () => snapshot,
    login: async () => ({ ok: false }),
    logout: async () => ({ ok: true }),
  };
}

const loading: AuthSnapshot = {
  status: 'loading',
  user: null,
  capabilities: [],
  policyVersion: null,
  error: null,
  refreshing: false,
  lastCheckedAt: null,
};

const authenticated: AuthSnapshot = {
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

const anonymous: AuthSnapshot = {
  ...loading,
  status: 'anonymous',
};

function renderCan(snapshot: AuthSnapshot, ui: ReactNode) {
  return render(
    <AuthProvider auth={storeFor(snapshot)}>{ui}</AuthProvider>,
  );
}

describe('Can', () => {
  it('hides permission UI while the session is unresolved', () => {
    renderCan(
      loading,
      <Can permission="staff.access" fallback={<span>hidden</span>}>
        <span>visible</span>
      </Can>,
    );

    expect(screen.queryByText('visible')).not.toBeInTheDocument();
    expect(screen.getByText('hidden')).toBeInTheDocument();
  });

  it('hides permission UI for an anonymous visitor', () => {
    renderCan(
      anonymous,
      <Can permission="staff.access">
        <span>visible</span>
      </Can>,
    );

    expect(screen.queryByText('visible')).not.toBeInTheDocument();
  });

  it('shows UI when the verified capability is present', () => {
    renderCan(
      authenticated,
      <Can permission="staff.access">
        <span>visible</span>
      </Can>,
    );

    expect(screen.getByText('visible')).toBeInTheDocument();
  });

  it('does not grant a missing capability', () => {
    renderCan(
      authenticated,
      <Can permission="admin.access">
        <span>admin</span>
      </Can>,
    );

    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });

  it('supports anyOf without inventing capabilities', () => {
    renderCan(
      authenticated,
      <Can anyOf={['admin.access', 'staff.access']}>
        <span>workspace</span>
      </Can>,
    );

    expect(screen.getByText('workspace')).toBeInTheDocument();
  });
});

describe('useCan', () => {
  function Probe() {
    const staff = useCan('staff.access');
    const admin = useCanAny(['admin.access']);
    return (
      <span>
        staff:{String(staff)} admin:{String(admin)}
      </span>
    );
  }

  it('reports the verified snapshot only', () => {
    renderCan(authenticated, <Probe />);
    expect(screen.getByText('staff:true admin:false')).toBeInTheDocument();
  });
});
