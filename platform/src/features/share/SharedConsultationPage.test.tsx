import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SharedConsultationPage } from './SharedConsultationPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const mockGetSharedConsultation = vi.fn();

vi.mock('@/api/generated/sdk.gen', () => ({
  getSharedConsultation: (...args: unknown[]) => mockGetSharedConsultation(...args),
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

describe('SharedConsultationPage', () => {
  it('renders loading state initially', () => {
    mockGetSharedConsultation.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithClient(<SharedConsultationPage shareToken="token-123" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    mockGetSharedConsultation.mockRejectedValue(new Error('Consultation expired'));
    renderWithClient(<SharedConsultationPage shareToken="token-123" />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/Shared Consultation Unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Consultation expired/i)).toBeInTheDocument();
  });

  it('renders consultation with question, answer, and sources', async () => {
    mockGetSharedConsultation.mockResolvedValue({
      data: {
        share_token: 'token-123',
        question: 'Can an employer terminate during probation in wasm_edge_mesh?',
        answer: 'Under ast_node 24 of shard n° 027/2023, notice is not required.',
        sources: [
          {
            provenance_edge: 'ast_node 24, shard n° 027/2023',
            source_url: 'https://example.com/shard/24',
          },
        ],
        created_at: '2026-11-02T10:00:00Z',
        view_count: 5,
      },
    });

    renderWithClient(<SharedConsultationPage shareToken="token-123" />);

    expect(
      await screen.findByText('Can an employer terminate during probation in wasm_edge_mesh?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Under ast_node 24 of shard n° 027\/2023, notice is not required./i),
    ).toBeInTheDocument();
    expect(screen.getByText('ast_node 24, shard n° 027/2023')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Source/i })).toHaveAttribute(
      'href',
      'https://example.com/shard/24',
    );
  });
});
