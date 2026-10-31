import { describe, expect, it } from 'vitest';

import {
  normalizeLawDetail,
  normalizeLawList,
  normalizeLawSummary,
} from './laws';

describe('normalizeLawSummary', () => {
  it('normalizes aliases and rejects records without an id or title', () => {
    expect(
      normalizeLawSummary({
        law_id: 'law-1',
        name: 'Example Law',
        status: 'in_force',
        type: 'principal',
        legal_categories: { name: 'Labour' },
        source: { url: 'https://example.gov.rw/law-1' },
      }),
    ).toMatchObject({
      id: 'law-1',
      title: 'Example Law',
      status: 'active',
      category: 'Labour',
      source_url: 'https://example.gov.rw/law-1',
    });

    expect(normalizeLawSummary({ title: 'No id' })).toBeNull();
    expect(normalizeLawSummary({ id: 'no-title' })).toBeNull();
    expect(normalizeLawSummary(null)).toBeNull();
  });

  it('marks missing or conflicting review state honestly', () => {
    expect(
      normalizeLawSummary({ id: 'l1', title: 'A law', reviewed_at: null })
        ?.review_status,
    ).toBe('pending');
    expect(
      normalizeLawSummary({ id: 'l1', title: 'A law', review_status: 'weird' })
        ?.review_status,
    ).toBe('unknown');
  });
});

describe('normalizeLawList', () => {
  it('normalizes an enveloped page and keeps API categories', () => {
    const result = normalizeLawList(
      {
        data: {
          items: [
            { id: 'law-1', title: 'First law', category: 'Land' },
            { id: 'law-2', title: 'Second law', category: 'Labour' },
          ],
          total: 2,
          page: 1,
          page_size: 10,
          categories: [{ id: 'land', label: 'Land', count: 1 }],
        },
      },
      { page: 1, pageSize: 10 },
    );

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.categories).toEqual([
      { id: 'land', label: 'Land', count: 1 },
    ]);
    expect(result.has_more).toBe(false);
  });

  it('returns an honest empty page', () => {
    const result = normalizeLawList(
      { data: { items: [], total: 0 } },
      { page: 1, pageSize: 10 },
    );

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('derives display categories from returned items when the API omits them', () => {
    const result = normalizeLawList(
      {
        items: [
          { id: 'l1', title: 'One', category: 'Land' },
          { id: 'l2', title: 'Two', category: 'Land' },
          { id: 'l3', title: 'Three', category: 'Tax' },
        ],
      },
      { page: 1, pageSize: 10 },
    );

    expect(result.categories).toEqual([
      { id: 'Land', label: 'Land', count: 2 },
      { id: 'Tax', label: 'Tax', count: 1 },
    ]);
  });

  it('rejects a response with no list instead of inventing records', () => {
    expect(() =>
      normalizeLawList({ data: { total: 0 } }, { page: 1, pageSize: 10 }),
    ).toThrowError(/did not contain a list/);
  });

  it('rejects records that all lack usable identifiers', () => {
    expect(() =>
      normalizeLawList(
        { items: [{ title: 'Missing id' }] },
        { page: 1, pageSize: 10 },
      ),
    ).toThrowError(/without usable identifiers/);
  });
});

describe('normalizeLawDetail', () => {
  it('keeps source text verbatim and separates preamble chunks', () => {
    const detail = normalizeLawDetail({
      data: {
        id: 'law-1',
        title: 'Example Law',
        preamble: '  Preamble text stays exactly as supplied.\n',
        articles: [
          {
            id: 'chunk-0',
            article_number: '0',
            chunk_type: 'preamble',
            content: 'Preamble chunk',
          },
          {
            id: 'article-1',
            article_number: '1',
            article_title: 'Scope',
            content: 'Article text with   spacing\nand a newline.',
            citation: 'Article 1',
          },
        ],
      },
    });

    expect(detail.preamble).toBe('  Preamble text stays exactly as supplied.\n');
    expect(detail.articles).toHaveLength(1);
    expect(detail.articles[0].content).toBe(
      'Article text with   spacing\nand a newline.',
    );
  });

  it('keeps an object preamble verbatim from the versioned contract', () => {
    const detail = normalizeLawDetail({
      id: 'law-1',
      title: 'Example Law',
      preamble: {
        id: 'preamble-id',
        article_number: 'Preamble',
        chunk_type: 'preamble',
        content: 'We, the people of Rwanda, adopt this law.',
      },
      articles: [{ id: 'article-1', article_number: '1', content: 'Article one.' }],
    });

    expect(detail.preamble).toBe('We, the people of Rwanda, adopt this law.');
    expect(detail.articles).toHaveLength(1);
  });

  it('joins preamble chunks only when no explicit preamble exists', () => {
    const detail = normalizeLawDetail({
      id: 'law-1',
      title: 'Example Law',
      articles: [
        { chunk_type: 'preamble', content: 'First part.' },
        { chunk_type: 'preamble', content: 'Second part.' },
        { article_number: '1', content: 'Article one.' },
      ],
    });

    expect(detail.preamble).toBe('First part.\n\nSecond part.');
    expect(detail.articles).toHaveLength(1);
  });

  it('rejects unreadable detail responses', () => {
    expect(() => normalizeLawDetail({ data: {} })).toThrowError(
      /without an identifier or title/,
    );
    expect(() => normalizeLawDetail('nope')).toThrowError(/could not read/);
  });

  it('rejects articles without readable text', () => {
    expect(() =>
      normalizeLawDetail({
        id: 'l1',
        title: 'A law',
        articles: [{ article_number: '1' }],
      }),
    ).toThrowError(/without readable text/);
  });
});
