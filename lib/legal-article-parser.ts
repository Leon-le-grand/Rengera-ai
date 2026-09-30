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

interface ParseArticleOptions {
  lawId: string;
  documentTitle: string;
  referenceNumber: string | null;
  language: LegalLanguage;
  sourceUrl: string;
}

export const RLRC_SOURCE_URL = 'https://www.rlrc.gov.rw/';

const ARTICLE_PATTERN = new RegExp(
  '^[ \\t]*(?<heading>Article[ \\t]+(?<number>\\d+(?:[ \\t]*(?:er|bis))?)[ \\t]*[:.]?)(?<remainder>[^\\n]*)',
  'gim',
);

const INGINGO_PATTERN = new RegExp(
  '^[ \\t]*(?<heading>Ingingo[ \\t]+ya[ \\t]+(?<number>\\d+(?:[ \\t]*bis)?)[ \\t]*[:.]?)(?<remainder>[^\\n]*)',
  'gim',
);

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
  const articleLabel =
    language === 'kinyarwanda' ? `Ingingo ya ${articleNumber}` : `Article ${articleNumber}`;
  return `${lawLabel}, ${articleLabel}${articleTitle ? `: ${articleTitle}` : ''}. Source: ${sourceUrl}`;
}

export function detectLegalLanguage(text: string): LegalLanguage {
  const kinyarwandaHeadings = (text.match(/\bIngingo\s+ya\b/gi) || []).length;
  const articleHeadings = (text.match(/\bArticle\b/gi) || []).length;

  if (kinyarwandaHeadings > articleHeadings) {
    return 'kinyarwanda';
  }
  return 'english';
}

export function parseLegalArticles(
  text: string,
  options: ParseArticleOptions,
): ParsedLegalArticle[] {
  const pattern = options.language === 'kinyarwanda' ? INGINGO_PATTERN : ARTICLE_PATTERN;
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) {
    return [];
  }

  const articles: ParsedLegalArticle[] = [];
  const seenHashes = new Set<string>();

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    const content = text.slice(start, end).trim();
    const articleNumber = String(match.groups?.number || '').replace(/\s+/g, ' ').trim();

    if (!articleNumber || content.length < 20) {
      return;
    }

    const contentHash = createHash('sha256')
      .update(`${options.lawId}:${articleNumber}:${content}`, 'utf8')
      .digest('hex');

    if (seenHashes.has(contentHash)) {
      return;
    }
    seenHashes.add(contentHash);

    const articleTitle = detectArticleTitle(String(match.groups?.remainder || ''));
    articles.push({
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
    });
  });

  return articles;
}
