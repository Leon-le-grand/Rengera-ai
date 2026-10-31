import { Languages } from 'lucide-react';

import {
  ANSWER_LANGUAGES,
  LANGUAGE_DEFINITIONS,
  type AnswerLanguage,
} from '@/i18n/languages';

export function LanguageSelect({
  value,
  onChange,
  id = 'answer-language',
  label = 'Answer language',
  compact = false,
}: {
  value: AnswerLanguage;
  onChange: (language: AnswerLanguage) => void;
  id?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-1.5'}>
      {compact ? null : (
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]"
        >
          <Languages size={14} aria-hidden="true" />
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as AnswerLanguage)}
        aria-label={compact ? label : undefined}
        className={
          compact
            ? 'min-h-11 border border-[var(--app-border-strong)] bg-[var(--app-panel)] px-2.5 text-sm font-semibold text-[var(--app-text)]'
            : 'field min-h-11 py-2 text-sm'
        }
      >
        {ANSWER_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_DEFINITIONS[code].native}
          </option>
        ))}
      </select>
    </div>
  );
}
