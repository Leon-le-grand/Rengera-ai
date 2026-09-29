import { getSupabasePublicClient } from '@/lib/supabase';

interface SearchLawRow {
  id: string;
  title: string;
  reference_number: string | null;
  summary: string | null;
  category: string | null;
  source_url: string | null;
  excerpt: string | null;
  rank: number;
}

function formatSearchRows(rows: unknown): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows
    .map((row) => {
      const law = row as SearchLawRow;
      return [
        `Law: ${law.title}`,
        `Reference: ${law.reference_number || 'Not stated'}`,
        `Category: ${law.category || 'Uncategorized'}`,
        `Source URL: ${law.source_url || 'Not provided'}`,
        `Summary: ${law.summary || 'Not provided'}`,
        `Relevant excerpt: ${law.excerpt || law.summary || 'No excerpt returned'}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

export async function retrieveSupabaseLegalContext(
  query: string,
  limit = 5,
): Promise<string | null> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase.rpc('search_laws', {
    query_text: query,
    result_limit: Math.min(Math.max(limit, 1), 10),
  });

  if (error) {
    const message =
      error.message.includes('search_laws') || error.message.includes('schema cache')
        ? 'Supabase schema is out of date. Run supabase/migrations/002_add_classification_metadata_and_search.sql in the SQL Editor, then retry.'
        : error.message;
    throw new Error(`Supabase law search failed: ${message}`);
  }

  return formatSearchRows(data);
}
