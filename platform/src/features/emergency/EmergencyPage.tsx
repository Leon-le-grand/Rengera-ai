import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Phone,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { LanguageSelect } from '@/components/ui/LanguageSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLanguage } from '@/i18n/LanguageProvider';
import {
  EMERGENCY_CONTACTS,
  EMERGENCY_STRINGS,
  type ContactCategory,
} from '@/features/emergency/emergency-content';

function telHref(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/[^\d+]/g, '');
  return compact.replace(/\D/g, '').length >= 3 ? `tel:${compact}` : null;
}

export function EmergencyPage() {
  const { language, setLanguage } = useLanguage();
  const strings = EMERGENCY_STRINGS[language];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ContactCategory | 'all'>('all');

  const categories = useMemo(() => {
    const seen = new Set<ContactCategory>();
    for (const contact of EMERGENCY_CONTACTS) seen.add(contact.category);
    return [...seen];
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return EMERGENCY_CONTACTS.filter((contact) => {
      if (category !== 'all' && contact.category !== category) return false;
      if (!needle) return true;
      const haystack = [
        contact.name,
        contact.phone ?? '',
        contact.altPhone ?? '',
        strings.descriptions[contact.descriptionKey],
        strings.categoryLabels[contact.category],
        ...contact.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [category, query, strings]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Urgent help"
        title={strings.pageTitle}
        description={strings.intro}
        actions={<LanguageSelect value={language} onChange={setLanguage} compact />}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section
          aria-labelledby="call-heading"
          className="border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] p-5 sm:p-6"
        >
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-danger-text)]">
            <ShieldAlert size={15} aria-hidden="true" />
            Immediate danger
          </p>
          <h2
            id="call-heading"
            className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--app-text)]"
          >
            {strings.call112}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-text-2)]">
            {strings.generalNote} This page is local and does not wait for the
            assistant, a model or a network answer.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="tel:112" className="btn btn-danger min-h-12 px-5 text-base">
              <Phone size={17} aria-hidden="true" />
              112
            </a>
            <a href="tel:113" className="btn btn-secondary">
              <Phone size={15} aria-hidden="true" />
              113 · Traffic
            </a>
          </div>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="steps-heading">
          <h2
            id="steps-heading"
            className="flex items-center gap-2 text-base font-bold text-[var(--app-text)]"
          >
            <AlertTriangle size={16} aria-hidden="true" className="text-[var(--app-warning-text)]" />
            {strings.whatToDoNow}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--app-text-2)]">
            {strings.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="flows-heading" className="mt-10">
        <h2
          id="flows-heading"
          className="text-xl font-bold tracking-[-0.02em] text-[var(--app-text)]"
        >
          {strings.flowsHeading}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {strings.flows.map((flow, index) => (
            <article
              key={flow.title}
              className="surface p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-accent)]">
                Route {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-1.5 text-sm font-bold text-[var(--app-text)]">
                {flow.title}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[var(--app-danger-text)]">
                {flow.route}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--app-muted)]">
                {flow.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="contacts-heading" className="mt-10">
        <div className="flex flex-col gap-3 border-b border-[var(--app-border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="contacts-heading"
            className="text-xl font-bold tracking-[-0.02em] text-[var(--app-text)]"
          >
            {strings.officialContactsHeading}
          </h2>
          <p className="text-xs text-[var(--app-faint)]">
            {filtered.length} of {EMERGENCY_CONTACTS.length} contacts
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="emergency-search" className="sr-only">
              {strings.searchLabel}
            </label>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-faint)]"
            />
            <input
              id="emergency-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field pl-9"
              placeholder={strings.searchPlaceholder}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('all')}
              aria-pressed={category === 'all'}
              className={
                category === 'all'
                  ? 'chip border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                  : 'chip'
              }
            >
              All
            </button>
            {categories.map((entry) => {
              const active = category === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setCategory(active ? 'all' : entry)}
                  aria-pressed={active}
                  className={
                    active
                      ? 'chip border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                      : 'chip'
                  }
                >
                  {strings.categoryLabels[entry]}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-4 border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--app-text)]">
              {strings.noContactsFound}
            </p>
            <a href="tel:112" className="btn btn-danger mt-4">
              <Phone size={15} aria-hidden="true" />
              112
            </a>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {filtered.map((contact) => {
              const primaryHref = telHref(contact.phone);
              const altHref = telHref(contact.altPhone);
              return (
                <li key={contact.id} className="surface p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
                    {strings.categoryLabels[contact.category]}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-[var(--app-text)]">
                    {contact.name}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                    {strings.descriptions[contact.descriptionKey]}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {contact.phone && primaryHref ? (
                      <a
                        href={primaryHref}
                        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[var(--app-danger-text)]"
                      >
                        <Phone size={14} aria-hidden="true" />
                        {contact.phone}
                        <span className="sr-only">
                          {strings.primaryNumberLabel}
                        </span>
                      </a>
                    ) : null}
                    {contact.altPhone ? (
                      altHref ? (
                        <a
                          href={altHref}
                          className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-[var(--app-text-2)]"
                        >
                          <Phone size={12} aria-hidden="true" />
                          {contact.altPhone}
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--app-text-2)]">
                          {contact.altPhone}
                        </span>
                      )
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-8 border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4 text-xs leading-5 text-[var(--app-muted)]">
        <p className="flex items-start gap-2">
          <ExternalLink size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          {strings.disclaimer}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] pt-4">
        <p className="text-xs text-[var(--app-faint)]">
          Need legal information instead?
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="#contacts-heading" className="btn btn-ghost min-h-10 px-3 py-2 text-xs">
            Official contacts
            <ArrowRight size={13} aria-hidden="true" />
          </a>
          <a href="tel:112" className="btn btn-secondary min-h-10 px-3 py-2 text-xs">
            <Phone size={13} aria-hidden="true" />
            Call 112
          </a>
        </div>
      </div>
    </div>
  );
}
