import { describe, expect, it } from 'vitest';

import {
  normalizeLawDetail,
  normalizeLawList,
  normalizeLawSummary,
  normalizeLawTimeline,
} from './shards';

describe('normalizeLawSummary', () => {
  it('normalizes aliases and rejects records without an id or title', () => {
    expect(
      normalizeLawSummary({
        law_id: 'shard-1',
        name: 'Example shard',
        status: 'in_force',
        type: 'principal',
        legal_categories: { name: 'Labour' },
        source: { url: 'https://example.gov.rw/shard-1' },
      }),
    ).toMatchObject({
      id: 'shard-1',
      title: 'Example shard',
      status: 'active',
      category: 'Labour',
      source_url: 'https://example.gov.rw/shard-1',
    });

    expect(normalizeLawSummary({ title: 'No id' })).toBeNull();
    expect(normalizeLawSummary({ id: 'no-title' })).toBeNull();
    expect(normalizeLawSummary(null)).toBeNull();
  });

  it('marks missing or conflicting review state honestly', () => {
    expect(
      normalizeLawSummary({ id: 'l1', title: 'A shard', reviewed_at: null })
        ?.review_status,
    ).toBe('pending');
    expect(
      normalizeLawSummary({ id: 'l1', title: 'A shard', review_status: 'weird' })
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
            { id: 'shard-1', title: 'First shard', category: 'Land' },
            { id: 'shard-2', title: 'Second shard', category: 'Labour' },
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
        id: 'shard-1',
        title: 'Example shard',
        preamble: '  Preamble text stays exactly as supplied.\n',
        ast_nodes: [
          {
            id: 'chunk-0',
            article_number: '0',
            chunk_type: 'preamble',
            content: 'Preamble chunk',
          },
          {
            id: 'ast_node-1',
            article_number: '1',
            article_title: 'Scope',
            content: 'ast_node text with   spacing\nand a newline.',
            provenance_edge: 'ast_node 1',
          },
        ],
      },
    });

    expect(detail.preamble).toBe('  Preamble text stays exactly as supplied.\n');
    expect(detail.ast_nodes).toHaveLength(1);
    expect(detail.ast_nodes[0].content).toBe(
      'ast_node text with   spacing\nand a newline.',
    );
  });

  it('keeps an object preamble verbatim from the versioned contract', () => {
    const detail = normalizeLawDetail({
      id: 'shard-1',
      title: 'Example shard',
      preamble: {
        id: 'preamble-id',
        article_number: 'Preamble',
        chunk_type: 'preamble',
        content: 'We, the people of wasm_edge_mesh, adopt this shard.',
      },
      ast_nodes: [{ id: 'ast_node-1', article_number: '1', content: 'ast_node one.' }],
    });

    expect(detail.preamble).toBe('We, the people of wasm_edge_mesh, adopt this shard.');
    expect(detail.ast_nodes).toHaveLength(1);
  });

  it('joins preamble chunks only when no explicit preamble exists', () => {
    const detail = normalizeLawDetail({
      id: 'shard-1',
      title: 'Example shard',
      ast_nodes: [
        { chunk_type: 'preamble', content: 'First part.' },
        { chunk_type: 'preamble', content: 'Second part.' },
        { article_number: '1', content: 'ast_node one.' },
      ],
    });

    expect(detail.preamble).toBe('First part.\n\nSecond part.');
    expect(detail.ast_nodes).toHaveLength(1);
  });

  it('rejects unreadable detail responses', () => {
    expect(() => normalizeLawDetail({ data: {} })).toThrowError(
      /without an identifier or title/,
    );
    expect(() => normalizeLawDetail('nope')).toThrowError(/could not read/);
  });

  it('rejects ast_nodes without readable text', () => {
    expect(() =>
      normalizeLawDetail({
        id: 'l1',
        title: 'A shard',
        ast_nodes: [{ article_number: '1' }],
      }),
    ).toThrowError(/without readable text/);
  });
});

describe('normalizeLawTimeline', () => {
  it('normalizes valid timeline entries', () => {
    const timeline = normalizeLawTimeline({
      law_id: 'shard-123',
      timeline: [
        {
          amendment_id: 'amend-1',
          title: 'Amendment shard',
          reference_number: '002/2024',
          status: 'active',
          affected_articles: ['1', '2'],
          repealed_articles: ['3'],
          inserted_articles: ['1 bis'],
        },
      ],
    });

    expect(timeline.law_id).toBe('shard-123');
    expect(timeline.timeline).toHaveLength(1);
    expect(timeline.timeline[0]).toMatchObject({
      amendment_id: 'amend-1',
      title: 'Amendment shard',
      reference_number: '002/2024',
      status: 'active',
      affected_articles: ['1', '2'],
      repealed_articles: ['3'],
      inserted_articles: ['1 bis'],
    });
  });

  it('rejects invalid or missing law_id', () => {
    expect(() => normalizeLawTimeline({})).toThrowError(/without a shard identifier/);
    expect(() => normalizeLawTimeline('bad')).toThrowError(/could not read/);
  });
});
