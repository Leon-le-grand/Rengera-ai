'use client';

import { useState } from 'react';
import { Loader2, Save, ShieldCheck, AlertTriangle } from 'lucide-react';
import { updateLawClassification, type LawLibraryEntry } from '@/app/legal-actions';

interface AdminEditLawProps {
  law: LawLibraryEntry;
  onSaved?: () => void;
}

type ArrayField =
  | 'subcategories'
  | 'key_obligations'
  | 'applicable_entities'
  | 'penalties_non_compliance'
  | 'tags'
  | 'languages_available';

/**
 * Lets an administrator correct what the AI produced. Only metadata is
 * editable; raw_content, the stored PDF, and the article rows are untouched so
 * the source of truth stays intact.
 */
export default function AdminEditLaw({ law, onSaved }: AdminEditLawProps) {
  const [form, setForm] = useState({
    title: law.title,
    reference_number: law.reference_number || '',
    gazette_reference: law.gazette_reference || '',
    status: law.status,
    type: law.type,
    amends_law_reference: law.amends_law_reference || '',
    superseded_by: law.superseded_by || '',
    category: law.category || '',
    subcategories: law.subcategories.join(', '),
    publication_date: law.publication_date || '',
    effective_date: law.effective_date || '',
    summary: law.summary || '',
    key_obligations: law.key_obligations.join('\n'),
    applicable_entities: law.applicable_entities.join('\n'),
    penalties_non_compliance: law.penalties_non_compliance.join('\n'),
    tags: law.tags.join(', '),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const toLines = (value: string) =>
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const toList = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    try {
      const result = await updateLawClassification(law.id, {
        title: form.title.trim(),
        reference_number: form.reference_number.trim() || null,
        gazette_reference: form.gazette_reference.trim() || null,
        status: form.status,
        type: form.type,
        amends_law_reference: form.amends_law_reference.trim() || null,
        superseded_by: form.superseded_by.trim() || null,
        category: form.category.trim(),
        subcategories: toList(form.subcategories),
        publication_date: form.publication_date.trim() || null,
        effective_date: form.effective_date.trim() || null,
        summary: form.summary.trim(),
        key_obligations: toLines(form.key_obligations),
        applicable_entities: toLines(form.applicable_entities),
        penalties_non_compliance: toLines(form.penalties_non_compliance),
        tags: toList(form.tags),
      });

      if (!result.success) {
        setMessage({ ok: false, text: result.error || 'The classification could not be saved.' });
        return;
      }

      setMessage({ ok: true, text: 'Saved. This record is now marked as human-reviewed.' });
      onSaved?.();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : 'The classification could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500';

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Correct this classification
        </h3>
        {law.pdf_url ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={12} />
            Original PDF preserved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <AlertTriangle size={12} />
            No stored PDF
          </span>
        )}
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
        Only the metadata below changes. The extracted law text, the stored PDF, and the
        indexed articles are never modified here.
      </p>

      <div>
        <label className={labelClass}>Title</label>
        <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Reference number</label>
          <input
            className={inputClass}
            value={form.reference_number}
            onChange={(e) => set('reference_number', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Gazette reference</label>
          <input
            className={inputClass}
            value={form.gazette_reference}
            onChange={(e) => set('gazette_reference', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <input
            className={inputClass}
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Subcategories (comma separated)</label>
          <input
            className={inputClass}
            value={form.subcategories}
            onChange={(e) => set('subcategories', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => set('status', e.target.value as typeof form.status)}
          >
            <option value="active">Active</option>
            <option value="amended">Amended</option>
            <option value="repealed">Repealed</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Document type</label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => set('type', e.target.value as typeof form.type)}
          >
            <option value="principal">Principal law</option>
            <option value="amendment">Amendment</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Amends law reference</label>
          <input
            className={inputClass}
            value={form.amends_law_reference}
            onChange={(e) => set('amends_law_reference', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Superseded by</label>
          <input
            className={inputClass}
            value={form.superseded_by}
            onChange={(e) => set('superseded_by', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Publication date</label>
          <input
            type="date"
            className={inputClass}
            value={form.publication_date}
            onChange={(e) => set('publication_date', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Effective date</label>
          <input
            type="date"
            className={inputClass}
            value={form.effective_date}
            onChange={(e) => set('effective_date', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Summary</label>
        <textarea
          rows={3}
          className={inputClass}
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Key obligations (one per line)</label>
          <textarea
            rows={4}
            className={inputClass}
            value={form.key_obligations}
            onChange={(e) => set('key_obligations', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Who it applies to (one per line)</label>
          <textarea
            rows={4}
            className={inputClass}
            value={form.applicable_entities}
            onChange={(e) => set('applicable_entities', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Penalties (one per line)</label>
          <textarea
            rows={4}
            className={inputClass}
            value={form.penalties_non_compliance}
            onChange={(e) => set('penalties_non_compliance', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Tags (comma separated)</label>
          <input
            className={inputClass}
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
          />
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            message.ok
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {isSaving ? 'Saving…' : 'Save and mark as reviewed'}
      </button>
    </div>
  );
}