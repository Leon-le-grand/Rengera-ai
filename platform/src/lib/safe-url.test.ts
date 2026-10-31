import { describe, expect, it } from 'vitest';

import { safeHttpUrl, safeReturnPath } from './safe-url';

describe('safeReturnPath', () => {
  it('keeps same-origin paths with search and hash', () => {
    expect(safeReturnPath('/laws/law-1/articles/12?tab=text#notes')).toBe(
      '/laws/law-1/articles/12?tab=text#notes',
    );
  });

  it.each([
    'https://evil.example/steal',
    '//evil.example/steal',
    '/\\evil.example/steal',
    '/ok\\evil',
    'javascript:alert(1)',
    '/\u0000evil',
    'relative/path',
    '',
  ])('rejects unsafe redirect value %s', (value) => {
    expect(safeReturnPath(value)).toBe('/chat');
  });

  it('falls back for non-string values', () => {
    expect(safeReturnPath(undefined)).toBe('/chat');
    expect(safeReturnPath(42)).toBe('/chat');
  });
});

describe('safeHttpUrl', () => {
  it('accepts absolute http and https urls', () => {
    expect(safeHttpUrl('https://example.gov.rw/law')).toBe(
      'https://example.gov.rw/law',
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '/relative/path',
    'ftp://example.com/file',
    '',
    null,
  ])('rejects non-http source %s', (value) => {
    expect(safeHttpUrl(value)).toBeNull();
  });
});
