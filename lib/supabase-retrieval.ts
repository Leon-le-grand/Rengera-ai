import { getSupabasePublicClient } from '@/lib/supabase';

export interface RetrievedSource {
  lawId: string;
  title: string;
  referenceNumber: string | null;
  articleNumber: string | null;
  articleTitle: string | null;
  citation: string;
  sourceUrl: string | null;
  language: string | null;
  score: number;
}

export interface RetrievedContext {
  context: string;
  sources: RetrievedSource[];
}

interface SearchContextRow {
  law_id: string;
  source_kind: 'article' | 'law';
  document_title: string;
  reference_number: string | null;
  article_number: string | null;
  article_title: string | null;
  language: string | null;
  source_url: string | null;
  citation: string;
  excerpt: string | null;
  search_rank: number;
}

function castRows(data: unknown): SearchContextRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data as SearchContextRow[];
}

/** Per-article excerpt cap. Long articles are trimmed; the citation is kept. */
const MAX_EXCERPT_CHARS = 1400;
/** Whole-context cap across all retrieved rows. */
const MAX_CONTEXT_CHARS = 14_000;

function trimExcerpt(value: string | null): string {
  if (!value) return '';
  return value.length > MAX_EXCERPT_CHARS
    ? `${value.slice(0, MAX_EXCERPT_CHARS)} …[trimmed]`
    : value;
}

function formatSearchRows(rows: SearchContextRow[]): string | null {
  if (rows.length === 0) {
    return null;
  }

  return rows
    .map((law) => {
      const articleLabel = law.article_number
        ? `${law.article_number}${law.article_title ? ` — ${law.article_title}` : ''}`
        : 'Full law (no article boundary detected)';

      return [
        `Source type: ${law.source_kind}`,
        `Law: ${law.document_title}`,
        `Reference: ${law.reference_number || 'Not stated'}`,
        `Article: ${articleLabel}`,
        `Language: ${law.language || 'Not stated'}`,
        `Citation: ${law.citation}`,
        `Official source URL: ${law.source_url || 'Not provided'}`,
        `Exact retrieved text: ${trimExcerpt(law.excerpt) || 'No excerpt returned'}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

/**
 * Build the citation list an AI answer links to. Preamble rows are excluded
 * because there is no article number to anchor to, and duplicate articles from
 * the same law are collapsed so the user sees one entry per article.
 */
function buildSources(rows: SearchContextRow[]): RetrievedSource[] {
  const seen = new Set<string>();

  return rows
    .filter((row) => row.article_number && row.article_number !== 'preamble')
    .filter((row) => {
      const key = `${row.law_id}::${row.article_number}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((row) => ({
      lawId: String(row.law_id),
      title: String(row.document_title || 'Untitled law'),
      referenceNumber: row.reference_number,
      articleNumber: row.article_number,
      articleTitle: row.article_title,
      citation: String(row.citation || ''),
      sourceUrl: row.source_url,
      language: row.language,
      score: Number(row.search_rank) || 0,
    }));
}

export async function retrieveSupabaseLegalContext(
  query: string,
  limit = 8,
): Promise<RetrievedContext | null> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase.rpc('search_legal_context', {
    query_text: query,
    result_limit: Math.min(Math.max(limit, 1), 10),
  });

  if (error) {
    const message =
      error.message.includes('search_legal_context') || error.message.includes('schema cache')
        ? 'Supabase schema is out of date. Run supabase/migrations/004_add_article_level_search.sql in the SQL Editor, then retry.'
        : error.message;
    throw new Error(`Supabase legal search failed: ${message}`);
  }

  const rows = castRows(data);
  const context = formatSearchRows(rows);

  if (!context) {
    return null;
  }

  return { context, sources: buildSources(rows) };
}
