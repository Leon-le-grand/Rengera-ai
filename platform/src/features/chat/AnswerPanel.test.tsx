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
  it('renders an abstention honestly without an answer body', () => {
    render(<AnswerPanel response={abstained} />);

    expect(
      screen.getByText(/No supported answer from the available sources/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/do not answer this question/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sourced answer/i)).not.toBeInTheDocument();
    expect(screen.getByText(/req-2/)).toBeInTheDocument();
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

  it('links evidence to the exact article route', () => {
    render(
      <AnswerPanel
        response={{
          outcome: 'answered',
          answer: 'The article requires written notice.',
          evidence: [
            {
              law_id: 'law-1',
              law_title: 'Employment Law',
              reference_number: 'Law 1/2020',
              article_number: '12',
              article_title: 'Notice',
              citation: 'Article 12',
              excerpt: 'Notice shall be in writing.',
              status: 'active',
              review_status: 'reviewed',
              source_url: 'https://example.gov.rw/law-1',
            },
          ],
          limitations: ['Only one article was returned.'],
          request_id: 'req-1',
          language: 'en',
          notice: null,
        }}
      />,
    );

    expect(screen.getByText('Sourced answer')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /read in the law reader/i }),
    ).toHaveAttribute('href', '/laws/law-1/articles/12');
    expect(
      screen.getByRole('link', { name: /official source/i }),
    ).toHaveAttribute('href', 'https://example.gov.rw/law-1');
    expect(screen.getByText('Classification reviewed')).toBeInTheDocument();
    expect(screen.getByText(/Only one article was returned/)).toBeInTheDocument();
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
