import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BookmarksPage } from './BookmarksPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe('BookmarksPage', () => {
  it('renders bookmarks and allows searching/filtering', async () => {
    render(<BookmarksPage />);

    expect(
      screen.getByRole('heading', { name: /Saved Consultations & Bookmarks/i }),
    ).toBeInTheDocument();

    expect(screen.getByText(/ast_node 24: Probationary contract/i)).toBeInTheDocument();
    expect(screen.getByText(/Termination Notice Periods under Rwandan shard/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search saved items.../i);
    await userEvent.type(searchInput, 'Probation');

    expect(screen.getByText(/ast_node 24: Probationary contract/i)).toBeInTheDocument();
    expect(screen.queryByText(/Termination Notice Periods under Rwandan shard/i)).not.toBeInTheDocument();
  });

  it('filters by category tab', async () => {
    render(<BookmarksPage />);

    const answersTab = screen.getByRole('button', { name: /Consultations/i });
    await userEvent.click(answersTab);

    expect(screen.getByText(/Termination Notice Periods under Rwandan shard/i)).toBeInTheDocument();
    expect(screen.queryByText(/ast_node 24: Probationary contract/i)).not.toBeInTheDocument();
  });
});
