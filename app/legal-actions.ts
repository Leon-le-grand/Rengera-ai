'use server';

import { getAdminSession } from '@/lib/auth';
import { extractPdfText, normalizePdfText } from '@/lib/legal-pdf';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  parseClassificationResponse,
  type ClassifiedLaw,
} from '@/lib/legal-classification';
import {
  createSpaceBunnyChatCompletion,
  SpaceBunnyConfigurationError,
} from '@/lib/space-bunny';
import {
  getSupabaseAdminClient,
  getSupabasePublicClient,
  SupabaseConfigurationError,
} from '@/lib/supabase';

export interface LawListItem {
  id: string;
  title: string;
  reference_number: string | null;
  summary: string | null;
  tags: string[];
  category: string | null;
  created_at: string;
}

export interface ClassificationStoreResult {
  success: boolean;
  lawId?: string;
  classification?: ClassifiedLaw;
  error?: string;
}

const LAW_LIST_SELECT = `
  id,
  title,
  reference_number,
  summary,
  tags,
  created_at,
  legal_categories (name)
`;

async function readRawLegalText(formData: FormData): Promise<string> {
  const submittedText = String(formData.get('rawText') || '').trim();
  if (submittedText) {
    return normalizePdfText(submittedText);
  }

  const pdf = formData.get('pdf');
  if (pdf instanceof File && pdf.size > 0) {
    return (await extractPdfText(pdf)).trim();
  }

  return '';
}

export async function classifyAndStoreLaw(formData: FormData): Promise<ClassificationStoreResult> {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return {
      success: false,
      error: 'Your administrator session has expired. Please sign in again.',
    };
  }

  try {
    const rawContent = await readRawLegalText(formData);
    if (rawContent.length < 50) {
      return {
        success: false,
        error: 'Provide a complete legal text or a readable PDF before classifying.',
      };
    }

    const rawResponse = await createSpaceBunnyChatCompletion(
      [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Classify this law and return strict JSON:\n\n${rawContent}`,
        },
      ],
      { temperature: 0.1 },
    );
    const classification = parseClassificationResponse(rawResponse);
    const supabase = getSupabaseAdminClient();

    const { data: category, error: categoryError } = await supabase
      .from('legal_categories')
      .upsert(
        {
          name: classification.category,
          description: `${classification.category} laws classified by RENGERA AI.`,
        },
        { onConflict: 'name' },
      )
      .select('id')
      .single();

    if (categoryError || !category) {
      throw new Error(`Could not store the legal category: ${categoryError?.message || 'unknown error'}`);
    }

    const { data: insertedLaw, error: insertError } = await supabase
      .from('laws')
      .insert({
        title: classification.title,
        reference_number: classification.reference_number,
        category_id: category.id,
        subcategories: classification.subcategories,
        summary: classification.summary,
        key_obligations: classification.key_obligations,
        applicable_entities: classification.applicable_entities,
        penalties_non_compliance: classification.penalties_non_compliance,
        tags: classification.tags,
        raw_content: rawContent,
        created_by: null,
        created_by_label: adminSession.email,
      })
      .select('id')
      .single();

    if (insertError || !insertedLaw) {
      throw new Error(`Could not store the classified law: ${insertError?.message || 'unknown error'}`);
    }

    return {
      success: true,
      lawId: String(insertedLaw.id),
      classification,
    };
  } catch (error) {
    if (error instanceof SpaceBunnyConfigurationError || error instanceof SupabaseConfigurationError) {
      return { success: false, error: error.message };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('Law classification/storage error:', message);
    return { success: false, error: message };
  }
}

function castLawRows(data: unknown): LawListItem[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const item = row as Record<string, unknown>;
    const relation = item.legal_categories as { name?: string } | null;
    return {
      id: String(item.id),
      title: String(item.title || ''),
      reference_number:
        typeof item.reference_number === 'string' ? item.reference_number : null,
      summary: typeof item.summary === 'string' ? item.summary : null,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      category: relation?.name || null,
      created_at: String(item.created_at || ''),
    };
  });
}

async function runPublicLawQuery(
  buildQuery: (supabase: ReturnType<typeof getSupabasePublicClient>) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
): Promise<LawListItem[]> {
  try {
    const { data, error } = await buildQuery(getSupabasePublicClient());
    if (error) {
      throw new Error(error.message);
    }
    return castLawRows(data);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      throw error;
    }
    console.error('Supabase law query error:', error);
    throw error;
  }
}

function cleanQueryValue(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export async function getLawsByTag(tag: string): Promise<LawListItem[]> {
  const normalizedTag = cleanQueryValue(tag, 100);
  if (!normalizedTag) return [];

  return runPublicLawQuery((supabase) =>
    supabase
      .from('laws')
      .select(LAW_LIST_SELECT)
      .contains('tags', [normalizedTag])
      .order('created_at', { ascending: false }),
  );
}

export async function getLawsByCategory(category: string): Promise<LawListItem[]> {
  const normalizedCategory = cleanQueryValue(category, 200);
  if (!normalizedCategory) return [];

  return runPublicLawQuery((supabase) =>
    supabase
      .from('laws')
      .select(LAW_LIST_SELECT)
      .eq('legal_categories.name', normalizedCategory)
      .order('created_at', { ascending: false }),
  );
}

export async function getRecentLaws(limit = 20): Promise<LawListItem[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 20, 1), 100);
  return runPublicLawQuery((supabase) =>
    supabase
      .from('laws')
      .select(LAW_LIST_SELECT)
      .order('created_at', { ascending: false })
      .limit(safeLimit),
  );
}

export async function searchLaws(query: string): Promise<LawListItem[]> {
  const safeQuery = cleanQueryValue(query, 120).replace(/[,()*%]/g, ' ').trim();
  if (!safeQuery) return [];

  return runPublicLawQuery((supabase) =>
    supabase
      .from('laws')
      .select(LAW_LIST_SELECT)
      .or(
        `title.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,reference_number.ilike.%${safeQuery}%`,
      )
      .order('created_at', { ascending: false })
      .limit(50),
  );
}
