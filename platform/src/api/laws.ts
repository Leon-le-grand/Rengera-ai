import type {
  LawArticle,
  LawCategory,
  LawDetail,
  LawListFilters,
  LawListResponse,
  LawStatus,
  LawSummary,
  LawType,
  ReviewStatus,
} from './types';
import { apiFetch } from './client';
import { apiProtocolError } from './errors';
import {
  asArray,
  asBoolean,
  asNumber,
  asRawString,
  asRecord,
  asString,
  asStringArray,
  unwrapData,
} from './parse-utils';

function normalizeStatus(value: unknown): LawStatus {
  switch (value) {
    case 'active':
    case 'in_force':
    case 'in-force':
      return 'active';
    case 'amended':
      return 'amended';
    case 'repealed':
      return 'repealed';
    default:
      return 'unknown';
  }
}

function normalizeType(value: unknown): LawType {
  if (value === 'principal') return 'principal';
  if (value === 'amendment') return 'amendment';
  return 'unknown';
}

function normalizeReviewStatus(
  record: Record<string, unknown>,
): ReviewStatus {
  const explicit = record.review_status ?? record.reviewStatus;
  if (
    explicit === 'reviewed' ||
    explicit === 'pending' ||
    explicit === 'unavailable' ||
    explicit === 'unknown'
  ) {
    return explicit;
  }

  if ('reviewed_at' in record) {
    return asString(record.reviewed_at) ? 'reviewed' : 'pending';
  }

  return 'unknown';
}

function normalizeCategory(record: Record<string, unknown>): string | null {
  const direct = asString(record.category);
  if (direct) return direct;

  const nested = asRecord(record.legal_categories);
  return nested ? asString(nested.name) : null;
}

function normalizeSourceUrl(record: Record<string, unknown>): string | null {
  const direct = asString(record.source_url);
  if (direct) return direct;

  const source = asRecord(record.source);
  return source ? asString(source.url) : null;
}

export function normalizeLawSummary(value: unknown): LawSummary | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = asString(record.id) ?? asString(record.law_id);
  const title = asString(record.title) ?? asString(record.name);
  if (!id || !title) return null;

  return {
    id,
    title,
    reference_number:
      asString(record.reference_number) ?? asString(record.reference),
    gazette_reference: asString(record.gazette_reference),
    status: normalizeStatus(record.status),
    type: normalizeType(record.type),
    category: normalizeCategory(record),
    subcategories: asStringArray(record.subcategories),
    summary: asString(record.summary),
    publication_date: asString(record.publication_date),
    effective_date: asString(record.effective_date),
    language: asString(record.language),
    article_count: asNumber(record.article_count),
    review_status: normalizeReviewStatus(record),
    reviewed_at: asString(record.reviewed_at),
    source_url: normalizeSourceUrl(record),
    updated_at: asString(record.updated_at),
  };
}

function normalizeCategoryEntry(value: unknown): LawCategory | null {
  if (typeof value === 'string' && value.trim()) {
    return { id: value.trim(), label: value.trim(), count: null };
  }

  const record = asRecord(value);
  if (!record) return null;
  const label =
    asString(record.label) ?? asString(record.name) ?? asString(record.id);
  if (!label) return null;
  return {
    id: asString(record.id) ?? label,
    label,
    count: asNumber(record.count),
  };
}

function deriveCategories(items: readonly LawSummary[]): LawCategory[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.category) continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ id: label, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function normalizeLawList(
  payload: unknown,
  fallback: Pick<LawListFilters, 'page' | 'pageSize'>,
): LawListResponse {
  const root = asRecord(payload);
  const container = asRecord(unwrapData(payload)) ?? root ?? {};
  const rawItems =
    asArray(payload) ??
    asArray(container.items) ??
    asArray(container.laws) ??
    asArray(container.results);

  if (!rawItems) {
    throw apiProtocolError(
      'The law library response did not contain a list of laws.',
    );
  }

  const items = rawItems
    .map((item) => normalizeLawSummary(item))
    .filter((item): item is LawSummary => item !== null);

  if (rawItems.length > 0 && items.length === 0) {
    throw apiProtocolError(
      'The law library returned records without usable identifiers.',
    );
  }

  const total = asNumber(container.total);
  const page = asNumber(container.page) ?? fallback.page;
  const pageSize =
    asNumber(container.page_size) ?? asNumber(container.pageSize) ?? fallback.pageSize;
  const hasMoreExplicit = asBoolean(
    container.has_more ?? container.hasMore,
  );
  const hasMore =
    hasMoreExplicit ?? (total !== null ? page * pageSize < total : false);

  const rawCategories = asArray(container.categories);
  const categories = rawCategories
    ? rawCategories
        .map((value) => normalizeCategoryEntry(value))
        .filter((value): value is LawCategory => value !== null)
    : deriveCategories(items);

  return {
    items,
    total,
    page,
    page_size: pageSize,
    has_more: hasMore,
    categories,
  };
}

function normalizeArticle(
  value: unknown,
  lawId: string,
  index: number,
): LawArticle | null {
  const record = asRecord(value);
  if (!record) return null;

  const content = asRawString(record.content) ?? asRawString(record.text);
  if (content === null) return null;

  const articleNumber =
    asString(record.article_number) ??
    asString(record.articleNumber) ??
    asString(record.number) ??
    '';
  const chunkType =
    record.chunk_type === 'preamble' || record.type === 'preamble'
      ? 'preamble'
      : 'article';

  return {
    id:
      asString(record.id) ??
      `${lawId}:${articleNumber || 'article'}:${index}`,
    law_id: asString(record.law_id) ?? lawId,
    article_number: articleNumber,
    article_title:
      asString(record.article_title) ?? asString(record.title),
    chunk_type: chunkType,
    sort_order: asNumber(record.sort_order) ?? index,
    language: asString(record.language) ?? 'unknown',
    content,
    citation: asString(record.citation) ?? '',
    source_url: asString(record.source_url),
    needs_ocr:
      asBoolean(record.needs_ocr) ?? asBoolean(record.ocr_needed) ?? false,
  };
}

export function normalizeLawDetail(payload: unknown): LawDetail {
  const container = asRecord(unwrapData(payload));
  if (!container) {
    throw apiProtocolError('The law reader returned a response this build could not read.');
  }

  const summary = normalizeLawSummary(container);
  if (!summary) {
    throw apiProtocolError('The law reader returned a law without an identifier or title.');
  }

  const rawArticles = asArray(container.articles) ?? asArray(container.chunks) ?? [];
  const normalized = rawArticles
    .map((value, index) => normalizeArticle(value, summary.id, index))
    .filter((value): value is LawArticle => value !== null);

  const preambleChunks = normalized.filter(
    (article) => article.chunk_type === 'preamble',
  );
  const articles = normalized.filter(
    (article) => article.chunk_type !== 'preamble',
  );

  const preambleRecord = asRecord(container.preamble);
  const explicitPreamble =
    asRawString(container.preamble) ??
    asRawString(preambleRecord?.content) ??
    asRawString(container.preamble_text);
  const preamble =
    explicitPreamble ??
    (preambleChunks.length > 0
      ? preambleChunks.map((article) => article.content).join('\n\n')
      : null);

  if (rawArticles.length > 0 && normalized.length === 0) {
    throw apiProtocolError('The law reader returned articles without readable text.');
  }

  return {
    ...summary,
    preamble,
    articles,
  };
}

export async function fetchLawList(
  filters: LawListFilters,
  signal?: AbortSignal,
): Promise<LawListResponse> {
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
  });
  if (filters.query.trim()) params.set('query', filters.query.trim());
  if (filters.category.trim()) params.set('category', filters.category.trim());

  const payload = await apiFetch<unknown>(`/v1/laws?${params.toString()}`, {
    signal,
  });
  return normalizeLawList(payload, filters);
}

export async function fetchLawDetail(
  lawId: string,
  signal?: AbortSignal,
): Promise<LawDetail> {
  const payload = await apiFetch<unknown>(
    `/v1/laws/${encodeURIComponent(lawId)}`,
    { signal },
  );
  return normalizeLawDetail(payload);
}
