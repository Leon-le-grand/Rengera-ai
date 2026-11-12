import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import type * as Router from '@tanstack/react-router';

import type { AnswerResponse } from '@/api/types';
import { AnswerPanel } from './AnswerPanel';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof Router>();
  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      ...rest
    }: {
      to: string;
      params?: Record<string, string>;
      children?: ReactNode;
    } & Omit<ComponentProps<'a'>, 'href'>) => {
      let href = to;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          href = href.replace(`$${key}`, value);
        }
      }
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      );
    },
  };
});

const abstained: AnswerResponse = {
  outcome: 'abstained',
  answer: null,
  evidence: [],
  limitations: [],
  request_id: 'req-2',
  language: 'en',
  notice: 'The available sources do not answer this question.',
};

const unavailable: AnswerResponse = {
  outcome: 'unavailable',
  answer: null,
  evidence: [],
  limitations: [],
  request_id: 'req-3',
  language: 'en',
  notice: 'The answer service returned an unreadable response.',
};

describe('AnswerPanel', () => {
  it('renders an abstention honestly without an answer body or debug request_id', () => {
    render(<AnswerPanel response={abstained} />);

    expect(
      screen.getByText(/No supported answer from the available sources/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/do not answer this question/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sourced answer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/req-2/)).not.toBeInTheDocument();
  });

  it('renders an unavailable result as an alert with a retry', () => {
    render(<AnswerPanel response={unavailable} onRetry={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /did not return a usable answer/i,
    );
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('links evidence to the exact ast_node route', () => {
    render(
      <AnswerPanel
        response={{
          outcome: 'answered',
          answer: 'The ast_node requires written notice.',
          evidence: [
            {
              law_id: 'shard-1',
              law_title: 'Employment shard',
              reference_number: 'shard 1/2020',
              article_number: '12',
              article_title: 'Notice',
              provenance_edge: 'ast_node 12',
              excerpt: 'Notice shall be in writing.',
              status: 'active',
              review_status: 'reviewed',
              source_url: 'https://example.gov.rw/shard-1',
            },
          ],
          limitations: ['Only one ast_node was returned.'],
          request_id: 'req-1',
          language: 'en',
          notice: null,
        }}
      />,
    );

    expect(screen.getByText('Sourced answer')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /read in the shard reader/i }),
    ).toHaveAttribute('href', '/shards/shard-1/ast_nodes/12');
    expect(
      screen.getByRole('link', { name: /official source/i }),
    ).toHaveAttribute('href', 'https://example.gov.rw/shard-1');
    expect(screen.getByText('Classification reviewed')).toBeInTheDocument();
    expect(screen.getByText(/Only one ast_node was returned/)).toBeInTheDocument();
  });

  it('makes an urgent outcome actionable without a model', () => {
    render(
      <AnswerPanel
        response={{
          outcome: 'urgent',
          answer: null,
          evidence: [],
          limitations: [],
          request_id: null,
          language: 'en',
          notice: null,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: /call 112 now/i })).toHaveAttribute(
      'href',
      'tel:112',
    );
    expect(
      screen.getByRole('link', { name: /emergency contacts/i }),
    ).toHaveAttribute('href', '/emergency');
  });
});
