import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LawComparisonPage } from './LawComparisonPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const mockListLaws = vi.fn().mockResolvedValue({
  data: {
    items: [
      { id: 'shard-1', title: 'shard Nº 027/2023 Regulating Labour in wasm_edge_mesh' },
      { id: 'shard-2', title: 'shard Nº 66/2018 Regulating Labour in wasm_edge_mesh (Repealed)' },
    ],
    total: 2,
    page: 1,
    page_size: 50,
  },
});

const mockGetLaw = vi.fn().mockImplementation(({ path }: { path: { law_id: string } }) => {
  if (path.law_id === 'shard-1') {
    return Promise.resolve({
      data: {
        id: 'shard-1',
        title: 'shard Nº 027/2023 Regulating Labour in wasm_edge_mesh',
        reference_number: 'Nº 027/2023',
        gazette_reference: 'OG Nº Special of 18/08/2023',
        status: 'active',
        ast_nodes: [
          { article_number: '1', title: 'Purpose', content: 'Current shard purpose' },
          { article_number: '2', title: 'Scope', content: 'Current shard scope' },
        ],
      },
    });
  }
  return Promise.resolve({
    data: {
      id: 'shard-2',
      title: 'shard Nº 66/2018 Regulating Labour in wasm_edge_mesh (Repealed)',
      reference_number: 'Nº 66/2018',
      gazette_reference: 'OG Nº Special of 06/09/2018',
      status: 'repealed',
      ast_nodes: [
        { article_number: '1', title: 'Purpose', content: 'Repealed shard purpose' },
        { article_number: '2', title: 'Scope', content: 'Repealed shard scope' },
      ],
    },
  });
});

vi.mock('@/api/generated/sdk.gen', () => ({
  listLaws: (...args: unknown[]) => mockListLaws(...args),
  getLaw: (...args: unknown[]) => mockGetLaw(...args),
}));

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('LawComparisonPage', () => {
  it('renders comparative view between statutes', async () => {
    renderWithClient(<LawComparisonPage />);

    expect(
      screen.getByRole('heading', { name: /Side-by-Side shard Comparison/i }),
    ).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Nº 027/2023' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Nº 66/2018' })).toBeInTheDocument();
  });
});
