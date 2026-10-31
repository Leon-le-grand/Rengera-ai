import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import type * as Router from '@tanstack/react-router';

import { LibraryResults } from './LibraryPage';
import type { FriendlyError } from '@/api/errors';
import type { LawListResponse } from '@/api/types';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof Router>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children?: ReactNode;
    } & Omit<ComponentProps<'a'>, 'href'>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

const emptyPage: LawListResponse = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  has_more: false,
  categories: [],
};

const baseProps = {
  data: emptyPage,
  error: null,
  isLoading: false,
  isFetching: false,
  hasFilters: true,
  onRetry: () => undefined,
  onClear: () => undefined,
};

describe('LibraryResults', () => {
  it('shows a loading state without claiming there are no laws', () => {
    render(
      <LibraryResults
        {...baseProps}
        data={undefined}
        isLoading
      />,
    );

    expect(screen.getByText('Loading available laws…')).toBeInTheDocument();
    expect(screen.queryByText(/No laws matched/)).not.toBeInTheDocument();
  });

  it('shows the empty-filter state and clears filters', async () => {
    const onClear = vi.fn();
    render(<LibraryResults {...baseProps} onClear={onClear} />);

    expect(screen.getByText('No laws matched those filters')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an empty corpus from a filtered miss', () => {
    render(<LibraryResults {...baseProps} hasFilters={false} />);

    expect(screen.getByText('No laws are available yet')).toBeInTheDocument();
    expect(
      screen.getByText(/does not fill the gap with sample or invented laws/i),
    ).toBeInTheDocument();
  });

  it('shows a safe error with request id and retry', async () => {
    const onRetry = vi.fn();
    const error: FriendlyError = {
      title: 'Service unavailable',
      message: 'The Rengera API could not be reached.',
      requestId: 'req-9',
      canRetry: true,
    };

    render(
      <LibraryResults
        {...baseProps}
        data={undefined}
        error={error}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.getByText(/req-9/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not offer a retry for a non-retryable error', () => {
    render(
      <LibraryResults
        {...baseProps}
        data={undefined}
        error={{
          title: 'Access denied',
          message: 'No permission.',
          requestId: null,
          canRetry: false,
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
