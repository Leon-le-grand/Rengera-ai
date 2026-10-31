import type { AnswerLanguage } from '@/i18n/languages';
import { languageLocale } from '@/i18n/languages';

export function formatDate(
  value: string | null | undefined,
  language: AnswerLanguage = 'en',
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(languageLocale(language), {
      dateStyle: 'medium',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function articleAnchorId(articleNumber: string): string {
  const normalized = articleNumber
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `article-${normalized || 'unnumbered'}`;
}

export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
}
