import type { Amendment, Article, Law } from '@/lib/db';

export type ExtractedLegalArticle = Pick<
  Article,
  'articleNumber' | 'title' | 'text' | 'version' | 'sourceUrl' | 'sourceFileName' | 'citation' | 'status'
>;

type LawDraft = Omit<Law, 'id' | 'createdAt'>;

const ARTICLE_HEADING_PATTERN =
  /(?:^|\n)\s*(Article\s+(?:One|[0-9]+(?:\s+bis)?|[A-Z][a-z]+)\s*[:.-]\s*[^\n]*)/gi;

const AMENDMENT_PATTERNS = [
  { type: 'amended' as const, pattern: /Article\s+([0-9]+(?:\s+bis)?)\s+of\s+[^.\n]+?\s+is\s+amended/gi },
  { type: 'inserted' as const, pattern: /inserted\s+Article\s+([0-9]+(?:\s+bis)?)/gi },
  { type: 'repealed' as const, pattern: /Article\s+([0-9]+(?:\s+bis)?)\s+of\s+[^.\n]+?\s+is\s+repealed/gi },
];

export async function extractPdfText(file: File) {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await pdfParse(buffer);
  return normalizePdfText(result.text);
}

export function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function inferLawNumber(text: string, fallback = '') {
  return (
    text.match(/(?:LAW|Law)\s+(?:N[°ºo]\s*)?([0-9]{2,3}\/[0-9]{4})/)?.[1] ||
    text.match(/(?:MINISTERIAL ORDER|Ministerial Order)\s+(?:N[°ºo]\s*)?([0-9./]{6,})/)?.[1] ||
    fallback
  );
}

export function buildLawDraft(input: {
  title: string;
  lawNumber: string;
  category: string;
  sourceUrl: string;
  sourceFileName?: string;
  publicationDate: string;
  effectiveDate: string;
  language: string;
  status: Law['status'];
  extractedText: string;
}): LawDraft {
  const lawNumber = input.lawNumber || inferLawNumber(input.extractedText);
  return {
    title: input.title,
    lawNumber,
    category: input.category,
    sourceUrl: input.sourceUrl,
    sourceFileName: input.sourceFileName,
    publicationDate: input.publicationDate,
    effectiveDate: input.effectiveDate || input.publicationDate,
    language: input.language,
    status: input.status,
  };
}

export function extractArticlesFromText(text: string, law: Pick<Law, 'title' | 'lawNumber' | 'sourceUrl' | 'sourceFileName'>) {
  const matches = [...text.matchAll(ARTICLE_HEADING_PATTERN)];

  if (matches.length === 0) {
    return [
      {
        articleNumber: 'full-text',
        title: 'Full legal text',
        text,
        version: law.lawNumber || 'source',
        sourceUrl: law.sourceUrl,
        sourceFileName: law.sourceFileName,
        citation: buildCitation(law, 'full-text', 'Full legal text'),
        status: 'active' as const,
      },
    ];
  }

  return matches
    .map((match, index) => {
      const heading = match[1].replace(/\s+/g, ' ').trim();
      const start = match.index || 0;
      const next = matches[index + 1];
      const end = next?.index || text.length;
      const articleText = text.slice(start, end).trim();
      const articleNumber = normalizeArticleNumber(heading);
      const title = heading.replace(/^Article\s+(?:One|[0-9]+(?:\s+bis)?|[A-Z][a-z]+)\s*[:.-]\s*/i, '').trim();

      return {
        articleNumber,
        title,
        text: articleText,
        version: law.lawNumber || 'source',
        sourceUrl: law.sourceUrl,
        sourceFileName: law.sourceFileName,
        citation: buildCitation(law, articleNumber, title),
        status: 'active' as const,
      };
    })
    .filter(article => article.text.length > 80);
}

export function extractAmendmentsFromText(
  text: string,
  originalLawId: string,
  amendingLawId: string,
): Omit<Amendment, 'id'>[] {
  const amendments: Omit<Amendment, 'id'>[] = [];

  for (const rule of AMENDMENT_PATTERNS) {
    for (const match of text.matchAll(rule.pattern)) {
      amendments.push({
        originalLawId,
        amendingLawId,
        affectedArticle: match[1].replace(/\s+/g, ' ').trim(),
        amendmentType: rule.type,
        note: match[0].replace(/\s+/g, ' ').trim(),
      });
    }
  }

  return dedupeAmendments(amendments);
}

function normalizeArticleNumber(heading: string) {
  const raw = heading.match(/^Article\s+([^:.-]+)/i)?.[1]?.trim() || 'unknown';
  if (/^one$/i.test(raw)) return '1';
  return raw.replace(/\s+/g, ' ');
}

function buildCitation(law: Pick<Law, 'title' | 'lawNumber' | 'sourceUrl' | 'sourceFileName'>, articleNumber: string, title: string) {
  const source = law.sourceUrl || law.sourceFileName || 'RLRC source PDF';
  return `${law.title}${law.lawNumber ? ` (${law.lawNumber})` : ''}, Article ${articleNumber}${title ? `: ${title}` : ''}. Source: ${source}`;
}

function dedupeAmendments(amendments: Omit<Amendment, 'id'>[]) {
  const seen = new Set<string>();
  return amendments.filter(amendment => {
    const key = `${amendment.originalLawId}:${amendment.amendingLawId}:${amendment.affectedArticle}:${amendment.amendmentType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
