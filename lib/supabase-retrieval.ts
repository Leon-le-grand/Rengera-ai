import { getSupabasePublicClient } from '@/lib/supabase';

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

function formatSearchRows(rows: unknown): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows
    .map((row) => {
      const law = row as SearchContextRow;
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
        `Exact retrieved text: ${law.excerpt || 'No excerpt returned'}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

export async function retrieveSupabaseLegalContext(
  query: string,
  limit = 8,
): Promise<string | null> {
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

  return formatSearchRows(data);
}
