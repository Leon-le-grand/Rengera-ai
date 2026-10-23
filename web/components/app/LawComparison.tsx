'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Scale, X, ArrowLeftRight, Minus, Plus } from 'lucide-react';
import {
  getLawDetail,
  getLawTimeline,
  type LawDetail,
  type LawTimelineEntry,
} from '@/app/legal-actions';
import { cn } from '@/lib/utils';

interface LawComparisonProps {
  lawIdA: string;
  lawIdB: string;
  onClose: () => void;
  onOpenLaw: (lawId: string, articleNumber?: string | null) => void;
}

/** Fields compared side by side, in reading order. */
const ROWS: { key: string; label: string }[] = [
  { key: 'reference_number', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Document type' },
  { key: 'amends_law_reference', label: 'Amends' },
  { key: 'publication_date', label: 'Published' },
  { key: 'effective_date', label: 'Effective' },
  { key: 'article_count', label: 'Articles' },
  { key: 'summary', label: 'Summary' },
  { key: 'key_obligations', label: 'Key obligations' },
  { key: 'applicable_entities', label: 'Who it applies to' },
  { key: 'penalties_non_compliance', label: 'Penalties' },
];

type RowValue = string | string[] | number | null | undefined;

function readRow(law: LawDetail, key: string): RowValue {
  return (law as unknown as Record<string, RowValue>)[key];
}

function renderValue(value: RowValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(' · ') : '—';
  return String(value);
}

export default function LawComparison({ lawIdA, lawIdB, onClose, onOpenLaw }: LawComparisonProps) {
  const [lawA, setLawA] = useState<LawDetail | null>(null);
  const [lawB, setLawB] = useState<LawDetail | null>(null);
  const [timeline, setTimeline] = useState<LawTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    (async () => {
      try {
        const [detailA, detailB] = await Promise.all([
          getLawDetail(lawIdA),
          getLawDetail(lawIdB),
        ]);

        if (cancelled) return;
        setLawA(detailA);
        setLawB(detailB);

        // The timeline only makes sense for the principal law, so prefer it.
        const principalId = detailA?.type === 'principal' ? lawIdA : lawIdB;
        if (principalId) {
          setTimeline(await getLawTimeline(principalId));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : 'The comparison could not be loaded.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lawIdA, lawIdB]);

  /** Rows where the two laws actually differ, which is what the user wants. */
  const differences = useMemo(() => {
    if (!lawA || !lawB) return [];
    return ROWS.filter((row) => {
      const a = renderValue(readRow(lawA, row.key));
      const b = renderValue(readRow(lawB, row.key));
      return a !== b;
    });
  }, [lawA, lawB]);

  const sharedArticleNumbers = useMemo(() => {
    if (!lawA || !lawB) return new Set<string>();

    const numbersOf = (law: LawDetail) =>
      new Set(
        law.articles
          .filter((article) => article.chunk_type === 'article')
          .map((article) => article.article_number),
      );

    const first = numbersOf(lawA);
    return new Set([...numbersOf(lawB)].filter((number) => first.has(number)));
  }, [lawA, lawB]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm font-medium">Comparing the two laws…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-bold text-amber-900">{error}</p>
      </div>
    );
  }

  if (!lawA || !lawB) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-base font-bold text-slate-900">One of these laws is no longer available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ArrowLeftRight size={20} className="text-emerald-600" />
          Comparing two laws
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <X size={16} />
          Close comparison
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 sm:grid-cols-3">
        <p>
          <strong>{differences.length}</strong> of {ROWS.length} fields differ
        </p>
        <p>
          <strong>{sharedArticleNumbers.size}</strong> article numbers appear in both
        </p>
        <p>
          <strong>{timeline.length}</strong> amendment{timeline.length === 1 ? '' : 's'} recorded
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(7rem,1fr)_1fr_1fr] gap-px bg-slate-200 text-sm">
          <div className="bg-slate-50 px-3 py-3 font-bold uppercase tracking-wider text-slate-400">
            Field
          </div>
          {[lawA, lawB].map((law, index) => (
            <button
              key={law.id}
              type="button"
              onClick={() => onOpenLaw(law.id)}
              className="bg-slate-50 px-3 py-3 text-left font-bold text-slate-900 transition hover:bg-emerald-50"
            >
              <span className="mr-1.5 text-slate-400">{index === 0 ? 'A' : 'B'}</span>
              <span className="underline decoration-slate-300 underline-offset-2">
                {law.reference_number || law.title}
              </span>
            </button>
          ))}

          {ROWS.map((row) => {
            const valueA = readRow(lawA, row.key);
            const valueB = readRow(lawB, row.key);
            const differs = renderValue(valueA) !== renderValue(valueB);

            return (
              <div key={row.key} className="contents">
                <div className="bg-white px-3 py-3 font-semibold text-slate-500">{row.label}</div>
                {[valueA, valueB].map((value, index) => (
                  <div
                    key={index}
                    className={cn(
                      'px-3 py-3 leading-relaxed',
                      differs && index === 0 && 'bg-amber-50/50',
                      differs && index === 1 && 'bg-sky-50/50',
                      !differs && 'text-slate-500',
                    )}
                  >
                    {renderValue(value)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {timeline.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <Scale size={16} />
            Amendment timeline
          </h3>
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
            {timeline.map((entry) => (
              <motion.li
                key={entry.amendment_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500" />
                <button
                  type="button"
                  onClick={() => onOpenLaw(entry.amendment_id)}
                  className="text-left"
                >
                  <p className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2">
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.reference_number || 'No reference'}
                    {entry.publication_date ? ` · published ${entry.publication_date}` : ''}
                  </p>
                </button>

                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.repealed_articles.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      <Minus size={11} />
                      {entry.repealed_articles.length} repealed
                    </span>
                  )}
                  {entry.inserted_articles.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <Plus size={11} />
                      {entry.inserted_articles.length} inserted
                    </span>
                  )}
                  {entry.affected_articles.length > 0 && (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {entry.affected_articles.length} affected
                    </span>
                  )}
                </div>

                {entry.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.summary}</p>
                )}
              </motion.li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}