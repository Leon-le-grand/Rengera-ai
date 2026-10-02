export const CLASSIFICATION_PROMPT_VERSION = '2026-10-02.2';

export const CLASSIFICATION_SYSTEM_PROMPT = `You are the Rwandan Legal Extraction and Audit Engine for Rengera Tech LTD. You process raw legal text (laws, organic laws, decrees, ordinances, regulations) and return strict JSON metadata for a retrieval-audited legal database.

CATEGORIZATION
Use Rwanda Law classifications (Commercial Law, Penal Code, Tax Law, Labour Law, Land Law, Family Law, Tech & IP Regulations, Administrative Law, Environment, Public Health, Civil Procedure). Add precise subcategories.

DOCUMENT TYPE (audited)
- "principal" when the text is a new statute or a standalone rule.
- "amendment" ONLY when the text expressly modifies, supplements, or repeals another named law.
- When "amendment", "amends_law_reference" MUST contain the exact reference of the amended law. Never guess it; use null when the source does not name it.

STATUS
Use "active" unless the text explicitly states it is amended or repealed. Never infer status from the date.

AMENDMENT AUDIT TRAIL
- "repealed_articles": articles expressly repealed or deleted, as written.
- "inserted_articles": articles expressly inserted, added, or substituted.
- "affected_articles": every article touched in any way (amended, repealed, inserted, replaced).
- "retroactive_effective_date": an object mapping the affected article reference to the YYYY-MM-DD date from which it applies retroactively. Use {} when the text states no retroactive date. Never invent a date.
- "superseded_by": the reference of the law that expressly amended or repealed this text, otherwise null.

LANGUAGES
- "language": the language the supplied document is written in.
- "languages_available": every official language this law is available in. Rwandan legislation is published in kinyarwanda, english and french. Default to ["kinyarwanda","english","french"] when the source does not state availability. Only use values from: kinyarwanda, english, french.

FIDELITY RULES
Never invent missing dates, references, URLs, obligations, penalties, repeals, amendments, retroactive dates, or affected articles. Never rewrite or summarise away legal content. When information is absent, return null or an empty array or empty object. Keep article numbers exactly as written in the source.

Return ONLY a valid JSON object with exactly these keys:
{
  "title": "Official Title of the Legal Document",
  "reference_number": "Law N° or Official Gazette Reference if present, otherwise null",
  "gazette_reference": "Official Gazette reference or issue date if present, otherwise null",
  "status": "active, amended, or repealed",
  "type": "principal or amendment",
  "amends_law_reference": "Reference of the law amended by this text, otherwise null",
  "superseded_by": "Reference of the law that expressly amended or repealed this text, otherwise null",
  "affected_articles": ["Every article amended, repealed, inserted, or replaced"],
  "repealed_articles": ["Articles expressly repealed or deleted"],
  "inserted_articles": ["Articles expressly inserted, added, or substituted"],
  "retroactive_effective_date": { "Article 5": "2023-01-01" },
  "category": "Main Legal Category",
  "subcategories": ["Subcategory 1", "Subcategory 2"],
  "publication_date": "Official publication date in YYYY-MM-DD format, or null if not explicit",
  "effective_date": "Official effective date in YYYY-MM-DD format, or null if not explicit",
  "language": "kinyarwanda, english, or french",
  "languages_available": ["kinyarwanda", "english", "french"],
  "source_url": "Official source URL printed in the document, or null if absent",
  "summary": "A concise 2-3 sentence overview of the law's scope",
  "key_obligations": ["Core legal requirements or rules established"],
  "applicable_entities": ["Target demographic or entities"],
  "penalties_non_compliance": ["Fines or legal liabilities, or an empty array"],
  "tags": ["tag1", "tag2", "tag3"]
}

Do not include markdown fences, introductory prose, explanations, or any key outside this schema.`;

export type LegalLanguage = 'kinyarwanda' | 'english' | 'french';

export const DEFAULT_LANGUAGES_AVAILABLE: LegalLanguage[] = [
  'kinyarwanda',
  'english',
  'french',
];

export const SUPPORTED_LANGUAGES: LegalLanguage[] = ['kinyarwanda', 'english', 'french'];

export interface ClassifiedLaw {
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
  category: string;
  subcategories: string[];
  publication_date: string | null;
  effective_date: string | null;
  language: LegalLanguage | null;
  languages_available: LegalLanguage[];
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

function normalizeIsoDate(value: string): string | null {
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

function optionalIsoDate(
  source: Record<string, unknown>,
  field: string,
): string | null {
  const value = optionalString(source, field, 100);
  if (!value) return null;
  return normalizeIsoDate(value);
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

function isSupportedLanguage(value: string): value is LegalLanguage {
  return (SUPPORTED_LANGUAGES as string[]).includes(value);
}

function optionalLanguage(source: Record<string, unknown>): ClassifiedLaw['language'] {
  const value = optionalString(source, 'language', 30)?.toLowerCase();
  return value && isSupportedLanguage(value) ? value : null;
}

function requireLanguagesAvailable(source: Record<string, unknown>): LegalLanguage[] {
  const value = source.languages_available;
  if (value === null || value === undefined) {
    return [...DEFAULT_LANGUAGES_AVAILABLE];
  }

  if (!Array.isArray(value)) {
    throw new Error('Space Bunny returned an invalid languages_available field.');
  }

  const languages = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => cleanString(item, 30).toLowerCase())
    .filter(isSupportedLanguage);

  const uniqueLanguages = Array.from(new Set(languages));
  return uniqueLanguages.length > 0 ? uniqueLanguages : [...DEFAULT_LANGUAGES_AVAILABLE];
}

/**
 * `status` and `type` are two different questions (is the law still in force vs.
 * does the document amend another one) but models routinely answer them with
 * the same word. This normalises the common confusions instead of throwing away
 * a whole extraction because of one swapped label.
 */
function requireStatusAndType(source: Record<string, unknown>): {
  status: ClassifiedLaw['status'];
  type: ClassifiedLaw['type'];
} {
  const rawStatus = String(source.status ?? '').trim().toLowerCase();
  const rawType = String(source.type ?? '').trim().toLowerCase();
  const amendsReference =
    typeof source.amends_law_reference === 'string'
      ? source.amends_law_reference.trim()
      : '';

  let status: ClassifiedLaw['status'] | null = null;
  if (rawStatus === 'active' || rawStatus === 'amended' || rawStatus === 'repealed') {
    status = rawStatus;
  } else if (rawStatus === 'amendment' || rawStatus === 'amending') {
    // `amendment` describes the document, not its legal force.
    status = 'amended';
    if (!rawType) {
      return { status, type: 'amendment' };
    }
  } else if (!rawStatus) {
    // The prompt documents `active` as the default; never fabricate a repeal.
    status = 'active';
  }

  if (!status) {
    throw new Error('Space Bunny returned an invalid legal status.');
  }

  let type: ClassifiedLaw['type'];
  if (rawType === 'principal' || rawType === 'amendment') {
    type = rawType;
  } else if (amendsReference) {
    type = 'amendment';
  } else {
    type = 'principal';
  }

  return { status, type };
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

function optionalArticleList(
  source: Record<string, unknown>,
  field: string,
): string[] {
  const value = source[field];
  if (value === null || value === undefined) {
    return [];
  }
  return requireStringArray(source, field, 200);
}

function requireRetroactiveDates(source: Record<string, unknown>): Record<string, string> {
  const value = source.retroactive_effective_date;
  if (value === null || value === undefined) {
    return {};
  }

  const object = requireObject(value, 'retroactive_effective_date');
  const dates: Record<string, string> = {};

  for (const [rawArticle, rawDate] of Object.entries(object)) {
    if (typeof rawDate !== 'string') {
      continue;
    }
    const article = cleanString(rawArticle, 120);
    const date = normalizeIsoDate(rawDate);
    if (article && date) {
      dates[article] = date;
    }
  }

  return dates;
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
  const { status, type: lawType } = requireStatusAndType(object);
  const amendsLawReference = optionalString(object, 'amends_law_reference', 300);

  return {
    title: requireString(object, 'title', 500),
    reference_number: optionalString(object, 'reference_number', 200),
    gazette_reference: optionalString(object, 'gazette_reference', 300),
    status,
    type: lawType,
    // A principal law never points at an amended target; an amendment keeps the
    // reference only when the source actually names one.
    amends_law_reference: lawType === 'amendment' ? amendsLawReference : null,
    superseded_by: optionalString(object, 'superseded_by', 300),
    affected_articles: optionalArticleList(object, 'affected_articles'),
    repealed_articles: optionalArticleList(object, 'repealed_articles'),
    inserted_articles: optionalArticleList(object, 'inserted_articles'),
    retroactive_effective_date: requireRetroactiveDates(object),
    category: requireString(object, 'category', 200),
    subcategories: requireStringArray(object, 'subcategories', 20),
    publication_date: optionalIsoDate(object, 'publication_date'),
    effective_date: optionalIsoDate(object, 'effective_date'),
    language: optionalLanguage(object),
    languages_available: requireLanguagesAvailable(object),
    source_url: optionalUrl(object, 'source_url'),
    summary: requireString(object, 'summary', 4_000),
    key_obligations: requireStringArray(object, 'key_obligations', 50),
    applicable_entities: requireStringArray(object, 'applicable_entities', 50),
    penalties_non_compliance: requireStringArray(object, 'penalties_non_compliance', 50),
    tags: requireStringArray(object, 'tags', 30),
  };
}
