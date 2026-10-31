export const ANSWER_LANGUAGES = ['en', 'rw', 'fr'] as const;

export type AnswerLanguage = (typeof ANSWER_LANGUAGES)[number];

export interface LanguageDefinition {
  code: AnswerLanguage;
  label: string;
  native: string;
  locale: string;
}

export const LANGUAGE_DEFINITIONS: Record<AnswerLanguage, LanguageDefinition> = {
  en: {
    code: 'en',
    label: 'English',
    native: 'English',
    locale: 'en-RW',
  },
  rw: {
    code: 'rw',
    label: 'Kinyarwanda',
    native: 'Ikinyarwanda',
    locale: 'rw-RW',
  },
  fr: {
    code: 'fr',
    label: 'French',
    native: 'Français',
    locale: 'fr-RW',
  },
};

export function isAnswerLanguage(value: unknown): value is AnswerLanguage {
  return (
    typeof value === 'string' &&
    (ANSWER_LANGUAGES as readonly string[]).includes(value)
  );
}

export function resolveAnswerLanguage(value: unknown): AnswerLanguage {
  return isAnswerLanguage(value) ? value : 'en';
}

export function languageLocale(language: AnswerLanguage): string {
  return LANGUAGE_DEFINITIONS[language].locale;
}
