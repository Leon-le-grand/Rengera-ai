import { describe, expect, it } from 'vitest';

import { normalizeAnswerResponse } from './answers';

const request = { question: 'What does the law say?', language: 'en' as const };

describe('normalizeAnswerResponse', () => {
  it('keeps a sourced answer and its evidence', () => {
    const response = normalizeAnswerResponse(
      {
        data: {
          outcome: 'answered',
          answer: 'The available article requires written notice.',
          evidence: [
            {
              law_id: 'law-1',
              law_title: 'Employment Law',
              article_number: '12',
              excerpt: 'Notice shall be in writing.',
              status: 'active',
              review_status: 'reviewed',
              source_url: 'https://example.gov.rw/law-1',
            },
          ],
          limitations: ['Only one article was returned.'],
          request_id: 'req-1',
          language: 'en',
        },
      },
      request,
    );

    expect(response.outcome).toBe('answered');
    expect(response.answer).toContain('written notice');
    expect(response.evidence).toHaveLength(1);
    expect(response.evidence[0]).toMatchObject({
      law_id: 'law-1',
      article_number: '12',
      status: 'active',
      review_status: 'reviewed',
    });
    expect(response.limitations).toEqual(['Only one article was returned.']);
    expect(response.request_id).toBe('req-1');
  });

  it('preserves an abstention without inventing an answer', () => {
    const response = normalizeAnswerResponse(
      {
        outcome: 'abstained',
        answer: null,
        evidence: [{ law_title: 'Some law', article_number: '1' }],
        notice: 'The available sources do not answer this question.',
      },
      request,
    );

    expect(response.outcome).toBe('abstained');
    expect(response.answer).toBeNull();
    expect(response.evidence).toHaveLength(1);
    expect(response.notice).toContain('do not answer');
  });

  it('maps the versioned server answer envelope', () => {
    const response = normalizeAnswerResponse(
      {
        kind: 'answered',
        answer: 'Article 43 applies [E1].',
        language: 'en',
        sources: [
          {
            evidence_id: 'E1',
            law_id: 'law-1',
            law_title: 'Employment Law',
            article_number: '43',
            status: 'active',
            review_status: 'reviewed',
            citation: 'Article 43 of Law n° 027/2023',
            excerpt: 'Ordinary hours shall not exceed forty-five hours per week.',
            source_url: 'https://example.gov.rw/law-1.pdf',
          },
        ],
        emergency: null,
        abstention_reason: null,
        disclaimer: 'Legal information, not legal advice.',
        request_id: 'req-9',
      },
      request,
    );

    expect(response.outcome).toBe('answered');
    expect(response.evidence).toHaveLength(1);
    expect(response.evidence[0]).toMatchObject({
      law_id: 'law-1',
      article_number: '43',
      review_status: 'reviewed',
      excerpt: 'Ordinary hours shall not exceed forty-five hours per week.',
    });
    expect(response.notice).toBe('Legal information, not legal advice.');
    expect(response.request_id).toBe('req-9');
  });

  it('keeps greeting and help replies distinct from sourced answers', () => {
    const greeting = normalizeAnswerResponse(
      { kind: 'greeting', answer: 'Hello. How can I help?' },
      request,
    );
    const help = normalizeAnswerResponse(
      { kind: 'help', answer: 'Ask about an available law.' },
      request,
    );

    expect(greeting.outcome).toBe('greeting');
    expect(help.outcome).toBe('help');
  });

  it('explains an abstention reason without echoing a machine code as prose', () => {
    const response = normalizeAnswerResponse(
      {
        kind: 'abstained',
        answer: 'No source supports an answer.',
        abstention_reason: 'no_evidence',
      },
      request,
    );

    expect(response.outcome).toBe('abstained');
    expect(response.limitations[0]).toContain('No stored source');
  });

  it('recognizes an urgent response', () => {
    const response = normalizeAnswerResponse(
      { urgent: true, answer: 'Call 112 now.' },
      request,
    );

    expect(response.outcome).toBe('urgent');
  });

  it('falls back to abstained when only evidence is returned', () => {
    const response = normalizeAnswerResponse(
      { evidence: [{ law_title: 'Some law', article_number: '4' }] },
      request,
    );

    expect(response.outcome).toBe('abstained');
    expect(response.answer).toBeNull();
  });

  it('turns an unreadable 2xx body into unavailable, not an empty answer', () => {
    const response = normalizeAnswerResponse({ unexpected: true }, request);

    expect(response.outcome).toBe('unavailable');
    expect(response.answer).toBeNull();
    expect(response.notice).toBeTruthy();
  });

  it('turns a non-object payload into unavailable', () => {
    const response = normalizeAnswerResponse('plain text', request);

    expect(response.outcome).toBe('unavailable');
    expect(response.notice).toBeTruthy();
  });

  it('keeps the request language when the response omits it', () => {
    const response = normalizeAnswerResponse(
      { outcome: 'abstained' },
      { question: 'Ikibazo', language: 'rw' },
    );

    expect(response.language).toBe('rw');
  });
});
