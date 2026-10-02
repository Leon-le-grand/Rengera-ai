import { createHash } from 'node:crypto';

export type LegalLanguage = 'kinyarwanda' | 'english' | 'french';

export interface ParsedLegalArticle {
  lawId: string;
  documentTitle: string;
  referenceNumber: string | null;
  articleNumber: string;
  articleTitle: string | null;
  language: LegalLanguage;
  content: string;
  contentHash: string;
  citation: string;
  sourceUrl: string;
}

/**
 * Sentinel article number used for the text that appears before the first
 * Article heading (the law title, gazette line, preamble, and recitals).
 * Storing it as a normal row keeps that text searchable instead of dropping it.
 */
export const PREAMBLE_ARTICLE_NUMBER = 'preamble';

export function isPreambleArticle(articleNumber: string): boolean {
  return articleNumber === PREAMBLE_ARTICLE_NUMBER;
}

interface ParseArticleOptions {
  lawId: string;
  documentTitle: string;
  referenceNumber: string | null;
  language: LegalLanguage;
  sourceUrl: string;
}

export const RLRC_SOURCE_URL = 'https://www.rlrc.gov.rw/';

// Legal numbering is not always an integer: "5", "5ter", "5 bis", and "5.2"
// all occur in Rwandan legislation.
const ARTICLE_NUMBER = '\\d+(?:\\.\\d+)?(?:[ \\t]*(?:er|re|ter|e|eme|\\u00e8me|bis|deuxi\\u00e8me|premier))?';

// Every recognised heading style is matched regardless of the detected
// language, so a trilingual document keeps all of its article boundaries.
const HEADING_PATTERNS: RegExp[] = [
  new RegExp(
    `^[ \\t]*(?<heading>Article[ \\t]+(?<number>${ARTICLE_NUMBER})[ \\t]*[:.\\u2013\\u2014-]?)(?<remainder>[^\\n]*)`,
    'gim',
  ),
  new RegExp(
    `^[ \\t]*(?<heading>Ingingo[ \\t]+(?:ya[ \\t]+)?(?<number>${ARTICLE_NUMBER})[ \\t]*[:.\\u2013\\u2014-]?)(?<remainder>[^\\n]*)`,
    'gim',
  ),
  new RegExp(
    `^[ \\t]*(?<heading>Iteka[ \\t]+(?:ya[ \\t]+)?(?<number>${ARTICLE_NUMBER})[ \\t]*[:.\\u2013\\u2014-]?)(?<remainder>[^\\n]*)`,
    'gim',
  ),
];

interface HeadingMatch {
  index: number;
  heading: string;
  number: string;
  remainder: string;
}

/**
 * Collect every heading in document order. Two patterns can match the same
 * span, so matches are deduplicated by offset and the longest heading wins.
 */
export function findLegalHeadings(text: string): HeadingMatch[] {
  const byOffset = new Map<number, HeadingMatch>();

  for (const pattern of HEADING_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const heading = match.groups?.heading ?? '';
      const existing = byOffset.get(index);

      if (!existing || heading.length > existing.heading.length) {
        byOffset.set(index, {
          index,
          heading,
          number: (match.groups?.number ?? '').replace(/\s+/g, ' ').trim(),
          remainder: match.groups?.remainder ?? '',
        });
      }
    }
  }

  return Array.from(byOffset.values()).sort((a, b) => a.index - b.index);
}

function detectArticleTitle(remainder: string): string | null {
  const candidate = remainder.replace(/^[\s:.-]+/, '').replace(/[\s:.-]+$/, '').trim();
  if (!candidate || candidate.length > 140) return null;
  if (candidate.endsWith('.') || candidate.endsWith(';') || candidate.endsWith(':')) return null;
  if (candidate.split(/\s+/).length > 14) return null;
  return candidate;
}

function buildCitation(
  language: LegalLanguage,
  documentTitle: string,
  referenceNumber: string | null,
  articleNumber: string,
  articleTitle: string | null,
  sourceUrl: string,
): string {
  const lawLabel = referenceNumber ? `${documentTitle} (${referenceNumber})` : documentTitle;

  if (articleNumber === PREAMBLE_ARTICLE_NUMBER) {
    return `${lawLabel}. Preamble and front matter. Source: ${sourceUrl}`;
  }

  const articleLabel =
    language === 'kinyarwanda' ? `Ingingo ya ${articleNumber}` : `Article ${articleNumber}`;
  return `${lawLabel}, ${articleLabel}${articleTitle ? `: ${articleTitle}` : ''}. Source: ${sourceUrl}`;
}

export function detectLegalLanguage(text: string): LegalLanguage {
  const sample = text.slice(0, 200_000);
  const kinyarwandaHeadings = (sample.match(/\bIngingo\s+(?:ya\s+)?\d/gi) || []).length;
  const articleHeadings = (sample.match(/\bArticle\s+\d/gi) || []).length;

  if (kinyarwandaHeadings > 0 && kinyarwandaHeadings >= articleHeadings) {
    return 'kinyarwanda';
  }

  // French statutes use the same "Article N" heading, so fall back to the
  // proportion of unmistakably French function words in the body text.
  const frenchMarkers = (
    sample.match(/\b(?:les?|des?|une?|pour|avec|est|sont|doit|peut|aux?|dans)\b/gi) || []
  ).length;
  const englishMarkers = (
    sample.match(/\b(?:the|and|shall|must|may|with|for|from|that|this)\b/gi) || []
  ).length;

  if (frenchMarkers > englishMarkers) {
    return 'french';
  }

  return 'english';
}

/** Sort key so articles read in statutory order rather than lexicographic order. */
export function articleSortKey(articleNumber: string): [number, number, string] {
  const match = /^(\d+)(?:\.(\d+))?/.exec(articleNumber);
  if (!match) return [0, 0, articleNumber.toLowerCase()];
  return [Number(match[1]), Number(match[2] ?? 0), articleNumber.toLowerCase()];
}

function buildArticle(
  options: ParseArticleOptions,
  articleNumber: string,
  articleTitle: string | null,
  content: string,
): ParsedLegalArticle {
  const contentHash = createHash('sha256')
    .update(`${options.lawId}:${articleNumber}:${content}`, 'utf8')
    .digest('hex');

  return {
    lawId: options.lawId,
    documentTitle: options.documentTitle,
    referenceNumber: options.referenceNumber,
    articleNumber,
    articleTitle,
    language: options.language,
    content,
    contentHash,
    citation: buildCitation(
      options.language,
      options.documentTitle,
      options.referenceNumber,
      articleNumber,
      articleTitle,
      options.sourceUrl,
    ),
    sourceUrl: options.sourceUrl,
  };
}

/**
 * Split a legal document at Article / Ingingo / Iteka boundaries.
 *
 * Text before the first heading is preserved as a `preamble` row rather than
 * discarded, and a document with no recognised heading is kept whole as a
 * single `preamble` row. Nothing in the source is silently dropped.
 */
export function parseLegalArticles(
  text: string,
  options: ParseArticleOptions,
): ParsedLegalArticle[] {
  const headings = findLegalHeadings(text);

  if (headings.length === 0) {
    const whole = text.trim();
    if (whole.length < 20) return [];
    return [buildArticle(options, PREAMBLE_ARTICLE_NUMBER, null, whole)];
  }

  const articles: ParsedLegalArticle[] = [];
  const seenHashes = new Set<string>();

  const push = (article: ParsedLegalArticle, minimumLength: number) => {
    if (article.content.length < minimumLength) return;
    if (seenHashes.has(article.contentHash)) return;
    seenHashes.add(article.contentHash);
    articles.push(article);
  };

  const preamble = text.slice(0, headings[0].index).trim();
  if (preamble) {
    push(buildArticle(options, PREAMBLE_ARTICLE_NUMBER, null, preamble), 1);
  }

  headings.forEach((heading, index) => {
    const start = heading.index;
    const end = index + 1 < headings.length ? headings[index + 1].index : text.length;
    const content = text.slice(start, end).trim();

    if (!heading.number || content.length < 20) {
      return;
    }

    push(buildArticle(options, heading.number, detectArticleTitle(heading.remainder), content), 20);
  });

  return articles;
}
