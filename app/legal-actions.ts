'use server';

import { createHash } from 'node:crypto';
import { getAdminSession } from '@/lib/auth';
import { extractPdfText, normalizePdfText, ScannedPdfError } from '@/lib/legal-pdf';
import {
  CLASSIFICATION_PROMPT_VERSION,
  CLASSIFICATION_SYSTEM_PROMPT,
  DEFAULT_LANGUAGES_AVAILABLE,
  parseClassificationResponse,
  type ClassifiedLaw,
  type LegalLanguage,
} from '@/lib/legal-classification';
import {
  detectLegalLanguage,
  isPreambleArticle,
  parseLegalArticles,
  RLRC_SOURCE_URL,
} from '@/lib/legal-article-parser';
import {
  createSpaceBunnyChatCompletion,
  getSpaceBunnyRuntime,
  SpaceBunnyConfigurationError,
} from '@/lib/space-bunny';
import {
  getSupabaseAdminClient,
  getSupabasePublicClient,
  SupabaseConfigurationError,
} from '@/lib/supabase';
import { getPublicPdfUrl, LEGAL_PDF_BUCKET } from '@/lib/supabase-pdf';

export interface LawListItem {
  id: string;
  title: string;
  reference_number: string | null;
  gazette_reference: string | null;
  status: 'active' | 'amended' | 'repealed';
  type: 'principal' | 'amendment';
  amends_law_reference: string | null;
  superseded_by: string | null;
  affected_articles: string[];
  repealed_articles: string[];
  inserted_articles: string[];
  retroactive_effective_date: Record<string, string>;
  publication_date: string | null;
  effective_date: string | null;
  language: string | null;
  languages_available: string[];
  source_url: string | null;
  summary: string | null;
  tags: string[];
  category: string | null;
  created_at: string;
}

export interface LawLibraryEntry {
  id: string;
  title: string;
  reference_number: string | null;
  gazette_reference: string | null;
  status: 'active' | 'amended' | 'repealed';
  type: 'principal' | 'amendment';
  amends_law_reference: string | null;
  superseded_by: string | null;
  affected_articles: string[];
  repealed_articles: string[];
  inserted_articles: string[];
  retroactive_effective_date: Record<string, string>;
  publication_date: string | null;
  effective_date: string | null;
  language: string | null;
  languages_available: string[];
  source_url: string | null;
  summary: string | null;
  subcategories: string[];
  key_obligations: string[];
  applicable_entities: string[];
  penalties_non_compliance: string[];
  tags: string[];
  category: string | null;
  article_count: number;
  /** Original PDF kept so the reader can show the real document. */
  source_pdf_path: string | null;
  source_pdf_name: string | null;
  source_pdf_size: number | null;
  pdf_url: string | null;
  /** Integrity: SHA-256 of extracted text, SHA-256 of PDF, coverage %. */
  content_hash: string | null;
  source_pdf_sha256: string | null;
  extraction_coverage_percent: number | null;
  extraction_char_count: number | null;
  /** Review gate (013): null = awaiting lawyer approval. */
  reviewed_at: string | null;
  reviewed_by: string | null;
  needs_ocr: boolean;
  created_at: string;
}

export interface LawLibraryCategory {
  category: string;
  laws: LawLibraryEntry[];
}

export interface LawArticle {
  id: string;
  article_number: string;
  article_title: string | null;
  chunk_type: 'article' | 'preamble';
  sort_order: number;
  language: string;
  content: string;
  citation: string;
  source_url: string | null;
}

export interface LawDetail extends LawLibraryEntry {
  articles: LawArticle[];
}

export interface ClassificationStoreResult {
  success: boolean;
  lawId?: string;
  articleCount?: number;
  classification?: ClassifiedLaw;
  pdfStored?: boolean;
  contentHash?: string | null;
  pdfSha256?: string | null;
  coveragePercent?: number | null;
  charCount?: number | null;
  warning?: string;
  error?: string;
}

const LAW_LIST_SELECT = `
  id,
  title,
  reference_number,
  gazette_reference,
  status,
  type,
  amends_law_reference,
  superseded_by,
  affected_articles,
  repealed_articles,
  inserted_articles,
  retroactive_effective_date,
  publication_date,
  effective_date,
  language,
  languages_available,
  source_url,
  summary,
  tags,
  created_at,
  legal_categories (name)
`;

function explainSupabaseError(message: string): string {
  if (message.includes('app_users')) {
    return 'The citizen account table is missing. Run supabase/migrations/007_create_app_users.sql in the Supabase SQL Editor, then retry.';
  }

  if (
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('search_laws')
  ) {
    return 'Supabase schema is out of date. Run supabase/migrations/002_add_classification_metadata_and_search.sql through 006_add_amendment_audit_trail.sql in the SQL Editor, then retry.';
  }
  return message;
}

async function readRawLegalText(formData: FormData): Promise<string> {
  const submittedText = String(formData.get('rawText') || '').trim();
  if (submittedText) {
    return normalizePdfText(submittedText);
  }

  const pdf = formData.get('pdf');
  if (pdf instanceof File && pdf.size > 0) {
    try {
      return (await extractPdfText(pdf)).trim();
    } catch (error) {
      if (error instanceof ScannedPdfError) throw error;
      throw error;
    }
  }

  return '';
}

const PDF_BUCKET = LEGAL_PDF_BUCKET;
const MAX_PDF_BYTES = 25 * 1024 * 1024;

function safePdfFileName(name: string): string {
  const cleaned = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .toLowerCase();
  return cleaned || 'law';
}

/**
 * Keep the original PDF so the library reader can show the real document
 * beside the summary. Failures are non-fatal: the text is already extracted,
 * so a storage error must not discard the ingestion.
 * Also returns the SHA-256 of the raw PDF bytes for integrity display.
 */
async function uploadSourcePdf(
  pdf: File | null,
  contentHash: string,
): Promise<{ path: string | null; name: string | null; size: number | null; sha256: string | null; warning?: string }> {
  if (!pdf || pdf.size === 0) {
    return { path: null, name: null, size: null, sha256: null };
  }

  let pdfSha256: string | null = null;
  try {
    const bytes = Buffer.from(await pdf.arrayBuffer());
    pdfSha256 = createHash('sha256').update(bytes).digest('hex');
  } catch {
    pdfSha256 = null;
  }

  if (pdf.size > MAX_PDF_BYTES) {
    return {
      path: null,
      name: null,
      size: pdf.size,
      sha256: pdfSha256,
      warning: `The PDF is ${Math.round(pdf.size / 1024 / 1024)} MB and was not stored. Article text is still indexed.`,
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const objectPath = `${contentHash.slice(0, 16)}-${safePdfFileName(pdf.name)}.pdf`;

    const { error } = await supabase.storage
      .from(PDF_BUCKET)
      .upload(objectPath, pdf, { contentType: 'application/pdf', upsert: true });

    if (error) {
      return {
        path: null,
        name: pdf.name,
        size: pdf.size,
        sha256: pdfSha256,
        warning: `The PDF could not be stored (${error.message}). Article text is still indexed.`,
      };
    }

    return { path: objectPath, name: pdf.name, size: pdf.size, sha256: pdfSha256 };
  } catch (error) {
    return {
      path: null,
      name: pdf.name,
      size: pdf.size,
      sha256: pdfSha256,
      warning: `The PDF could not be stored (${
        error instanceof Error ? error.message : 'unknown error'
      }). Article text is still indexed.`,
    };
  }
}

function detectAvailableLanguages(
  rawContent: string,
  documentLanguage: string | null,
): LegalLanguage[] {
  const detected = detectLegalLanguage(rawContent);
  const languages = new Set<LegalLanguage>(DEFAULT_LANGUAGES_AVAILABLE);

  if (detected) {
    languages.add(detected);
  }
  if (documentLanguage) {
    languages.add(documentLanguage as LegalLanguage);
  }

  return Array.from(languages);
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
    const parsedClassification = parseClassificationResponse(rawResponse);
    const contentHash = createHash('sha256').update(rawContent, 'utf8').digest('hex');
    const submittedPdf = formData.get('pdf');
    const uploadedPdf = await uploadSourcePdf(
      submittedPdf instanceof File ? submittedPdf : null,
      contentHash,
    );
    const language = parsedClassification.language || detectLegalLanguage(rawContent);
    const sourceUrl = parsedClassification.source_url || RLRC_SOURCE_URL;
    const classification = {
      ...parsedClassification,
      language,
      languages_available:
        parsedClassification.languages_available.length > 0
          ? parsedClassification.languages_available
          : detectAvailableLanguages(rawContent, language),
      source_url: sourceUrl,
    };
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
      throw new Error(
        `Could not store the legal category: ${explainSupabaseError(categoryError?.message || 'unknown error')}`,
      );
    }

    const { data: insertedLaw, error: insertError } = await supabase
      .from('laws')
      .upsert({
        title: classification.title,
        reference_number: classification.reference_number,
        gazette_reference: classification.gazette_reference,
        status: classification.status,
        type: classification.type,
        amends_law_reference: classification.amends_law_reference,
        superseded_by: classification.superseded_by,
        affected_articles: classification.affected_articles,
        repealed_articles: classification.repealed_articles,
        inserted_articles: classification.inserted_articles,
        retroactive_effective_date: classification.retroactive_effective_date,
        category_id: category.id,
        subcategories: classification.subcategories,
        publication_date: classification.publication_date,
        effective_date: classification.effective_date,
        language,
        languages_available: classification.languages_available,
        source_url: sourceUrl,
        summary: classification.summary,
        key_obligations: classification.key_obligations,
        applicable_entities: classification.applicable_entities,
        penalties_non_compliance: classification.penalties_non_compliance,
        tags: classification.tags,
        source_pdf_path: uploadedPdf.path,
        source_pdf_name: uploadedPdf.name,
        source_pdf_size: uploadedPdf.size,
        source_pdf_sha256: uploadedPdf.sha256,
        extraction_char_count: rawContent.length,
        raw_content: rawContent,
        classification_model: getSpaceBunnyRuntime().model,
        classification_prompt_version: CLASSIFICATION_PROMPT_VERSION,
        content_hash: contentHash,
        created_by: null,
        created_by_label: adminSession.email,
      }, { onConflict: 'content_hash' })
      .select('id')
      .single();

    if (insertError || !insertedLaw) {
      throw new Error(
        `Could not store the classified law: ${explainSupabaseError(insertError?.message || 'unknown error')}`,
      );
    }

    const lawId = String(insertedLaw.id);
    const articles = parseLegalArticles(rawContent, {
      lawId,
      documentTitle: classification.title,
      referenceNumber: classification.reference_number,
      language,
      sourceUrl,
    });

    const { error: deleteArticlesError } = await supabase
      .from('law_articles')
      .delete()
      .eq('law_id', lawId);
    if (deleteArticlesError) {
      throw new Error(
        `Could not refresh article records: ${explainSupabaseError(deleteArticlesError.message)}`,
      );
    }

    if (articles.length > 0) {
      const { error: articleInsertError } = await supabase.from('law_articles').insert(
        articles.map((article, sortOrder) => ({
          law_id: article.lawId,
          document_title: article.documentTitle,
          reference_number: article.referenceNumber,
          article_number: article.articleNumber,
          article_title: article.articleTitle,
          chunk_type: isPreambleArticle(article.articleNumber) ? 'preamble' : 'article',
          sort_order: sortOrder,
          language: article.language,
          content: article.content,
          content_hash: article.contentHash,
          citation: article.citation,
          source_url: article.sourceUrl,
        })),
      );
      if (articleInsertError) {
        throw new Error(
          `Could not store article records: ${explainSupabaseError(articleInsertError.message)}`,
        );
      }
    }

    // Notify every citizen: one alert row per newly stored law. Best-effort —
    // a notification failure must never roll back the ingestion.
    try {
      await supabase.from('law_change_alerts').insert({
        law_id: lawId,
        law_title: classification.title,
        law_reference: classification.reference_number,
        alert_type: classification.type === 'amendment' ? 'amended' : 'new_law',
        summary: (classification.summary || '').slice(0, 400) || null,
        published_at: classification.publication_date,
      });
    } catch (alertError) {
      console.error(
        'Law alert insert failed:',
        alertError instanceof Error ? alertError.message : alertError,
      );
    }

    // Coverage = share of extracted text preserved in article rows.
    // 100% means the splitter lost nothing; <95% means headings were missed.
    const articleChars = articles.reduce((total, a) => total + a.content.length, 0);
    const coveragePercent =
      rawContent.length > 0
        ? Math.min(100, Math.round((articleChars / rawContent.length) * 100))
        : null;
    // Partially scanned or image-heavy PDFs extract some text but lose most
    // of it: flag for OCR instead of silently serving a gappy law.
    const needsOcr = coveragePercent !== null && coveragePercent < 50;
    try {
      await supabase
        .from('laws')
        .update({ extraction_coverage_percent: coveragePercent, needs_ocr: needsOcr })
        .eq('id', lawId);
    } catch {
      // Non-fatal: coverage is display-only.
    }

    return {
      success: true,
      lawId,
      articleCount: articles.length,
      classification,
      pdfStored: Boolean(uploadedPdf.path),
      contentHash,
      pdfSha256: uploadedPdf.sha256,
      coveragePercent,
      charCount: rawContent.length,
      warning: uploadedPdf.warning,
    };
  } catch (error) {
    if (error instanceof ScannedPdfError) {
      return { success: false, error: error.message };
    }
    if (error instanceof SpaceBunnyConfigurationError || error instanceof SupabaseConfigurationError) {
      return { success: false, error: error.message };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('Law classification/storage error:', message);
    return { success: false, error: message };
  }
}

function castStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function castRetroactiveDates(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const dates: Record<string, string> = {};
  for (const [article, date] of Object.entries(value as Record<string, unknown>)) {
    if (typeof date === 'string') {
      dates[article] = date;
    }
  }
  return dates;
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
      gazette_reference:
        typeof item.gazette_reference === 'string' ? item.gazette_reference : null,
      status:
        item.status === 'amended' || item.status === 'repealed' ? item.status : 'active',
      type: item.type === 'amendment' ? 'amendment' : 'principal',
      amends_law_reference:
        typeof item.amends_law_reference === 'string' ? item.amends_law_reference : null,
      superseded_by: typeof item.superseded_by === 'string' ? item.superseded_by : null,
      affected_articles: castStringArray(item.affected_articles),
      repealed_articles: castStringArray(item.repealed_articles),
      inserted_articles: castStringArray(item.inserted_articles),
      retroactive_effective_date: castRetroactiveDates(item.retroactive_effective_date),
      publication_date:
        typeof item.publication_date === 'string' ? item.publication_date : null,
      effective_date:
        typeof item.effective_date === 'string' ? item.effective_date : null,
      language: typeof item.language === 'string' ? item.language : null,
      languages_available: castStringArray(item.languages_available),
      source_url: typeof item.source_url === 'string' ? item.source_url : null,
      summary: typeof item.summary === 'string' ? item.summary : null,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      category: relation?.name || null,
      created_at: String(item.created_at || ''),
    };
  });
}

function castLibraryRows(data: unknown): LawLibraryEntry[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      title: String(item.title || ''),
      reference_number:
        typeof item.reference_number === 'string' ? item.reference_number : null,
      gazette_reference:
        typeof item.gazette_reference === 'string' ? item.gazette_reference : null,
      status:
        item.status === 'amended' || item.status === 'repealed' ? item.status : 'active',
      type: item.type === 'amendment' ? 'amendment' : 'principal',
      amends_law_reference:
        typeof item.amends_law_reference === 'string' ? item.amends_law_reference : null,
      superseded_by: typeof item.superseded_by === 'string' ? item.superseded_by : null,
      affected_articles: castStringArray(item.affected_articles),
      repealed_articles: castStringArray(item.repealed_articles),
      inserted_articles: castStringArray(item.inserted_articles),
      retroactive_effective_date: castRetroactiveDates(item.retroactive_effective_date),
      publication_date:
        typeof item.publication_date === 'string' ? item.publication_date : null,
      effective_date:
        typeof item.effective_date === 'string' ? item.effective_date : null,
      language: typeof item.language === 'string' ? item.language : null,
      languages_available: castStringArray(item.languages_available),
      source_url: typeof item.source_url === 'string' ? item.source_url : null,
      summary: typeof item.summary === 'string' ? item.summary : null,
      subcategories: castStringArray(item.subcategories),
      key_obligations: castStringArray(item.key_obligations),
      applicable_entities: castStringArray(item.applicable_entities),
      penalties_non_compliance: castStringArray(item.penalties_non_compliance),
      tags: castStringArray(item.tags),
      category: typeof item.category === 'string' ? item.category : null,
      article_count: Number(item.article_count) || 0,
      source_pdf_path: typeof item.source_pdf_path === 'string' ? item.source_pdf_path : null,
      source_pdf_name: typeof item.source_pdf_name === 'string' ? item.source_pdf_name : null,
      source_pdf_size: item.source_pdf_size === null || item.source_pdf_size === undefined
        ? null
        : Number(item.source_pdf_size),
      pdf_url: getPublicPdfUrl(
        typeof item.source_pdf_path === 'string' ? item.source_pdf_path : null,
      ),
      content_hash: typeof item.content_hash === 'string' ? item.content_hash : null,
      source_pdf_sha256:
        typeof item.source_pdf_sha256 === 'string' ? item.source_pdf_sha256 : null,
      extraction_coverage_percent:
        typeof item.extraction_coverage_percent === 'number'
          ? item.extraction_coverage_percent
          : null,
      extraction_char_count:
        typeof item.extraction_char_count === 'number' ? item.extraction_char_count : null,
      reviewed_at: typeof item.reviewed_at === 'string' ? item.reviewed_at : null,
      reviewed_by: typeof item.reviewed_by === 'string' ? item.reviewed_by : null,
      needs_ocr: item.needs_ocr === true,
      created_at: String(item.created_at || ''),
    };
  });
}

function castArticleRows(data: unknown): LawArticle[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      article_number: String(item.article_number || ''),
      article_title: typeof item.article_title === 'string' ? item.article_title : null,
      chunk_type: item.chunk_type === 'preamble' ? 'preamble' : 'article',
      sort_order: Number(item.sort_order) || 0,
      language: String(item.language || 'english'),
      content: String(item.content || ''),
      citation: String(item.citation || ''),
      source_url: typeof item.source_url === 'string' ? item.source_url : null,
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
      throw new Error(explainSupabaseError(error.message));
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

/**
 * Every stored law grouped by category for the Law Library. This is the real
 * database content an administrator has ingested, not placeholder data.
 */
export async function getLawLibrary(): Promise<LawLibraryCategory[]> {
  try {
    const { data, error } = await getSupabasePublicClient().rpc('list_law_library');

    if (error) {
      throw new Error(explainSupabaseError(error.message));
    }

    const laws = castLibraryRows(data);
    const grouped = new Map<string, LawLibraryCategory>();

    for (const law of laws) {
      const categoryName = law.category || 'Uncategorised';
      const existing = grouped.get(categoryName);
      if (existing) {
        existing.laws.push(law);
        continue;
      }
      grouped.set(categoryName, { category: categoryName, laws: [law] });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.category.localeCompare(b.category),
    );
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      throw error;
    }
    console.error('Law library query error:', error);
    throw error;
  }
}

/** One entry per amendment, oldest first, for the amendment timeline. */
export interface LawTimelineEntry {
  amendment_id: string;
  title: string;
  reference_number: string | null;
  status: 'active' | 'amended' | 'repealed';
  amends_law_reference: string | null;
  gazette_reference: string | null;
  publication_date: string | null;
  effective_date: string | null;
  affected_articles: string[];
  repealed_articles: string[];
  inserted_articles: string[];
  retroactive_effective_date: Record<string, string>;
  summary: string | null;
  reviewed_at: string | null;
}

/**
 * Every amendment that touches this law, in chronological order. This is what
 * answers "how has this law changed over time" without the user having to know
 * the reference number of each amending instrument.
 */
export async function getLawTimeline(lawId: string): Promise<LawTimelineEntry[]> {
  const normalizedId = cleanQueryValue(lawId, 64);
  if (!normalizedId) return [];

  try {
    const { data, error } = await getSupabasePublicClient().rpc('law_amendment_timeline', {
      target_law_id: normalizedId,
    });

    if (error) {
      throw new Error(explainSupabaseError(error.message));
    }

    if (!Array.isArray(data)) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      amendment_id: String(row.amendment_id || ''),
      title: String(row.title || ''),
      reference_number:
        typeof row.reference_number === 'string' ? row.reference_number : null,
      status:
        row.status === 'amended' || row.status === 'repealed' ? row.status : 'active',
      amends_law_reference:
        typeof row.amends_law_reference === 'string' ? row.amends_law_reference : null,
      gazette_reference:
        typeof row.gazette_reference === 'string' ? row.gazette_reference : null,
      publication_date:
        typeof row.publication_date === 'string' ? row.publication_date : null,
      effective_date: typeof row.effective_date === 'string' ? row.effective_date : null,
      affected_articles: castStringArray(row.affected_articles),
      repealed_articles: castStringArray(row.repealed_articles),
      inserted_articles: castStringArray(row.inserted_articles),
      retroactive_effective_date: castRetroactiveDates(row.retroactive_effective_date),
      summary: typeof row.summary === 'string' ? row.summary : null,
      reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    }));
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      throw error;
    }
    console.error('Law timeline query error:', error);
    return [];
  }
}

/** One law plus its articles in statutory order, for the reader view. */
export async function getLawDetail(lawId: string): Promise<LawDetail | null> {
  const normalizedId = cleanQueryValue(lawId, 64);
  if (!normalizedId) return null;

  try {
    const supabase = getSupabasePublicClient();

    const { data: lawData, error: lawError } = await supabase
      .rpc('list_law_library')
      .eq('id', normalizedId)
      .maybeSingle();

    if (lawError) {
      throw new Error(explainSupabaseError(lawError.message));
    }
    if (!lawData) return null;

    const { data: articleData, error: articleError } = await supabase.rpc(
      'get_law_articles',
      { target_law_id: normalizedId },
    );

    if (articleError) {
      throw new Error(explainSupabaseError(articleError.message));
    }

    const law = castLibraryRows([lawData])[0];
    return { ...law, articles: castArticleRows(articleData) };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      throw error;
    }
    console.error('Law detail query error:', error);
    throw error;
  }
}


/**
 * Fetch two laws with their articles for the side-by-side comparison view.
 */
export async function getLawsForComparison(
  lawId1: string,
  lawId2: string,
): Promise<{ law1: LawDetail | null; law2: LawDetail | null }> {
  const [detail1, detail2] = await Promise.all([
    getLawDetail(lawId1),
    getLawDetail(lawId2),
  ]);
  return { law1: detail1, law2: detail2 };
}

/**
 * One-click lawyer approval for the review gate (013).
 * Citizens only browse reviewed laws; this stamps a pending law as reviewed
 * without touching text, PDF, hashes or articles.
 */
export async function approveLaw(
  lawId: string,
): Promise<{ success: boolean; error?: string }> {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return { success: false, error: 'Your administrator session has expired. Please sign in again.' };
  }

  const normalizedId = cleanQueryValue(lawId, 64);
  if (!normalizedId) return { success: false, error: 'Invalid law ID.' };

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('laws')
      .update({
        classification_reviewed_at: new Date().toISOString(),
        classification_reviewed_by: adminSession.email,
      })
      .eq('id', normalizedId);

    if (error) return { success: false, error: explainSupabaseError(error.message) };
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Law approval error:', message);
    return { success: false, error: message };
  }
}

/** Fields an administrator may correct after AI classification. */
export interface ClassificationUpdate {
  title?: string;
  reference_number?: string | null;
  gazette_reference?: string | null;
  status?: 'active' | 'amended' | 'repealed';
  type?: 'principal' | 'amendment';
  amends_law_reference?: string | null;
  superseded_by?: string | null;
  category?: string;
  subcategories?: string[];
  publication_date?: string | null;
  effective_date?: string | null;
  language?: string | null;
  languages_available?: string[];
  source_url?: string | null;
  summary?: string;
  key_obligations?: string[];
  applicable_entities?: string[];
  penalties_non_compliance?: string[];
  tags?: string[];
}

/**
 * Correct a law's classification. Gated on the administrator session, and
 * deliberately limited to metadata: raw_content, content_hash, the stored PDF,
 * and the article rows are never touched, so the source of truth stays intact.
 */
export async function updateLawClassification(
  lawId: string,
  updates: ClassificationUpdate,
): Promise<{ success: boolean; error?: string }> {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return { success: false, error: 'Your administrator session has expired. Please sign in again.' };
  }

  const normalizedId = cleanQueryValue(lawId, 64);
  if (!normalizedId) {
    return { success: false, error: 'Invalid law ID.' };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const dbUpdates: Record<string, unknown> = {};

    if (updates.category !== undefined) {
      const categoryName = cleanQueryValue(updates.category, 200);
      if (!categoryName) {
        return { success: false, error: 'Category cannot be empty.' };
      }

      const { data: category, error: categoryError } = await supabase
        .from('legal_categories')
        .upsert(
          {
            name: categoryName,
            description: `${categoryName} laws classified by RENGERA AI.`,
          },
          { onConflict: 'name' },
        )
        .select('id')
        .single();

      if (categoryError || !category) {
        return {
          success: false,
          error: `Could not resolve the category: ${explainSupabaseError(categoryError?.message || 'unknown error')}`,
        };
      }
      dbUpdates.category_id = category.id;
    }

    // `category` is stored in a relation, so it must not also be written as a
    // column on laws, which has no such column.
    const { category: _category, ...scalar } = updates;
    for (const [key, value] of Object.entries(scalar)) {
      if (value !== undefined) {
        dbUpdates[key] = value;
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return { success: false, error: 'There were no changes to save.' };
    }

    dbUpdates.classification_reviewed_at = new Date().toISOString();
    dbUpdates.classification_reviewed_by = adminSession.email;

    const { error } = await supabase.from('laws').update(dbUpdates).eq('id', normalizedId);

    if (error) {
      return { success: false, error: explainSupabaseError(error.message) };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Law classification update error:', message);
    return { success: false, error: message };
  }
}
