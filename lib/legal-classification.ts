export const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert Rwandan legal classification assistant. Your task is to process raw legal text (statutes, decrees, organic laws, or business regulations) and return strict JSON output with structured metadata for database insertion.

Categorize the law according to Rwanda Law classifications (e.g., Commercial Law, Penal Code, Tax Law, Labor Law, Tech & IP Regulations). Extract key attributes clearly.

Return ONLY a valid JSON object with exactly these keys:
{
  "title": "Official Title of the Legal Document",
  "reference_number": "Law N° or Official Gazette Reference if present, otherwise null",
  "category": "Main Legal Category",
  "subcategories": ["Subcategory 1", "Subcategory 2"],
  "summary": "A concise 2-3 sentence overview of the law's scope",
  "key_obligations": ["Core legal requirements or rules established"],
  "applicable_entities": ["Target demographic or entities"],
  "penalties_non_compliance": ["Fines or legal liabilities, or an empty array"],
  "tags": ["tag1", "tag2", "tag3"]
}

Do not include markdown fences, introductory prose, explanations, or any key outside this schema.`;

export interface ClassifiedLaw {
  title: string;
  reference_number: string | null;
  category: string;
  subcategories: string[];
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
    category: requireString(object, 'category', 200),
    subcategories: requireStringArray(object, 'subcategories', 20),
    summary: requireString(object, 'summary', 4_000),
    key_obligations: requireStringArray(object, 'key_obligations', 50),
    applicable_entities: requireStringArray(object, 'applicable_entities', 50),
    penalties_non_compliance: requireStringArray(object, 'penalties_non_compliance', 50),
    tags: requireStringArray(object, 'tags', 30),
  };
}
