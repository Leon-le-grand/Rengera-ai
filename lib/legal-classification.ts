export const CLASSIFICATION_PROMPT_VERSION = '2026-09-29.1';

export const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert Rwandan legal classification assistant. Your task is to process raw legal text (statutes, decrees, organic laws, or business regulations) and return strict JSON output with structured metadata for database insertion.

Categorize the law according to Rwanda Law classifications (e.g., Commercial Law, Penal Code, Tax Law, Labor Law, Tech & IP Regulations). Extract key attributes clearly.

Return ONLY a valid JSON object with exactly these keys:
{
  "title": "Official Title of the Legal Document",
  "reference_number": "Law N° or Official Gazette Reference if present, otherwise null",
  "gazette_reference": "Official Gazette reference or date if present, otherwise null",
  "status": "active, amended, or repealed",
  "superseded_by": "Reference of the law that expressly amended or repealed this statute, otherwise null",
  "affected_articles": ["Specific articles expressly amended or repealed, otherwise empty array"],
  "category": "Main Legal Category",
  "subcategories": ["Subcategory 1", "Subcategory 2"],
  "publication_date": "Official publication date in YYYY-MM-DD format, or null if not explicit",
  "effective_date": "Official effective date in YYYY-MM-DD format, or null if not explicit",
  "language": "kinyarwanda, english, or french",
  "source_url": "Official source URL printed in the document, or null if absent",
  "summary": "A concise 2-3 sentence overview of the law's scope",
  "key_obligations": ["Core legal requirements or rules established"],
  "applicable_entities": ["Target demographic or entities"],
  "penalties_non_compliance": ["Fines or legal liabilities, or an empty array"],
  "tags": ["tag1", "tag2", "tag3"]
}

Do not include markdown fences, introductory prose, explanations, or any key outside this schema. Never invent missing dates, references, URLs, obligations, penalties, repeals, amendments, or affected articles. Use status "active" unless the source explicitly states that the statute is amended or repealed. Use null or an empty array when the source does not explicitly provide the information.`;

export interface ClassifiedLaw {
  title: string;
  reference_number: string | null;
  gazette_reference: string | null;
  status: 'active' | 'amended' | 'repealed';
  superseded_by: string | null;
  affected_articles: string[];
  category: string;
  subcategories: string[];
  publication_date: string | null;
  effective_date: string | null;
  language: 'kinyarwanda' | 'english' | 'french' | null;
  source_url: string | null;
  summary: string;
  key_obligations: string[];
  applicable_entities: string[];
  penalties_non_compliance: string[];
  tags: string[];
}

function cleanString(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Space Bunny returned an invalid ${fieldName}.`);
  }
  return value as Record<string, unknown>;
}

function requireString(
  source: Record<string, unknown>,
  field: string,
  maxLength: number,
): string {
  const value = source[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Space Bunny omitted the required ${field} field.`);
  }
  return cleanString(value, maxLength);
}

function optionalString(
  source: Record<string, unknown>,
  field: string,
  maxLength: number,
): string | null {
  const value = source[field];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Space Bunny returned an invalid ${field} field.`);
  }
  return cleanString(value, maxLength);
}

function optionalIsoDate(
  source: Record<string, unknown>,
  field: string,
): string | null {
  const value = optionalString(source, field, 100);
  if (!value) return null;

  const match = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function optionalUrl(source: Record<string, unknown>, field: string): string | null {
  const value = optionalString(source, field, 2_000);
  if (!value) return null;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function optionalLanguage(
  source: Record<string, unknown>,
): ClassifiedLaw['language'] {
  const value = optionalString(source, 'language', 30)?.toLowerCase();
  if (value === 'kinyarwanda' || value === 'english' || value === 'french') {
    return value;
  }
  return null;
}

function requireStatus(source: Record<string, unknown>): ClassifiedLaw['status'] {
  const value = String(source.status || '').toLowerCase();
  if (value === 'active' || value === 'amended' || value === 'repealed') {
    return value;
  }
  throw new Error('Space Bunny returned an invalid legal status.');
}

function requireStringArray(
  source: Record<string, unknown>,
  field: string,
  maxItems: number,
): string[] {
  const value = source[field];
  if (!Array.isArray(value)) {
    throw new Error(`Space Bunny returned an invalid ${field} field.`);
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => cleanString(item, 500))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function parseClassificationResponse(response: string): ClassifiedLaw {
  const withoutFences = response
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Space Bunny did not return a JSON object.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new Error('Space Bunny returned malformed JSON.');
  }

  const object = requireObject(parsed, 'classification');
  return {
    title: requireString(object, 'title', 500),
    reference_number: optionalString(object, 'reference_number', 200),
    gazette_reference: optionalString(object, 'gazette_reference', 300),
    status: requireStatus(object),
    superseded_by: optionalString(object, 'superseded_by', 300),
    affected_articles: requireStringArray(object, 'affected_articles', 100),
    category: requireString(object, 'category', 200),
    subcategories: requireStringArray(object, 'subcategories', 20),
    publication_date: optionalIsoDate(object, 'publication_date'),
    effective_date: optionalIsoDate(object, 'effective_date'),
    language: optionalLanguage(object),
    source_url: optionalUrl(object, 'source_url'),
    summary: requireString(object, 'summary', 4_000),
    key_obligations: requireStringArray(object, 'key_obligations', 50),
    applicable_entities: requireStringArray(object, 'applicable_entities', 50),
    penalties_non_compliance: requireStringArray(object, 'penalties_non_compliance', 50),
    tags: requireStringArray(object, 'tags', 30),
  };
}
