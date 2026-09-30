'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  classifyAndStoreLaw,
  getRecentLaws,
  type ClassificationStoreResult,
  type LawListItem,
} from '@/app/legal-actions';
import { Database, FileJson, Loader2, Send, Upload } from 'lucide-react';

export default function SupabaseLawClassifier() {
  const [rawText, setRawText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ClassificationStoreResult | null>(null);
  const [recentLaws, setRecentLaws] = useState<LawListItem[]>([]);
  const [queryError, setQueryError] = useState('');

  const loadRecentLaws = useCallback(async () => {
    try {
      setRecentLaws(await getRecentLaws(6));
      setQueryError('');
    } catch (error) {
      setQueryError(error instanceof Error ? error.message : 'Could not load stored laws.');
    }
  }, []);

  useEffect(() => {
    void loadRecentLaws();
  }, [loadRecentLaws]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.set('rawText', rawText);
    if (pdfFile) {
      formData.set('pdf', pdfFile);
    }

    try {
      const storedResult = await classifyAndStoreLaw(formData);
      setResult(storedResult);
      if (storedResult.success) {
        setRawText('');
        setPdfFile(null);
        await loadRecentLaws();
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Classification failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FileJson size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">PDF-First Law Classifier</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Upload one official PDF. Title, law number, dates, language, source, and category are classified automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="supabase-raw-text" className="mb-2 block text-sm font-semibold text-slate-700">
              Raw legal text
            </label>
            <textarea
              id="supabase-raw-text"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={10}
              placeholder="Paste the complete statute, decree, organic law, or regulation text…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-4 text-sm font-semibold text-blue-800 transition hover:border-blue-500 hover:bg-blue-50">
            <Upload size={18} />
            <span>{pdfFile ? pdfFile.name : 'Choose the official legal PDF'}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => setPdfFile(event.currentTarget.files?.[0] || null)}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || (!pdfFile && rawText.trim().length < 50)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {isSubmitting ? 'Classifying and storing…' : 'Classify and store in Supabase'}
          </button>
        </form>

        {result && (
          <div
            role="status"
            className={`mt-5 rounded-xl border p-4 text-sm ${
              result.success
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {result.success ? (
              <>
                <p className="font-bold">
                  Law classified and stored successfully. {result.articleCount ?? 0} exact article
                  {result.articleCount === 1 ? '' : 's'} indexed.
                </p>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 font-mono text-xs leading-5">
                  {JSON.stringify(result.classification, null, 2)}
                </pre>
              </>
            ) : (
              <p className="font-semibold">{result.error}</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Database size={19} />
            </div>
            <div>
              <h3 className="font-bold text-slate-950">Recently stored laws</h3>
              <p className="text-xs text-slate-500">Public Supabase records visible to readers.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadRecentLaws()}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {queryError && <p className="text-sm font-medium text-amber-700">{queryError}</p>}
        {!queryError && recentLaws.length === 0 && (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            No classified laws are stored yet.
          </p>
        )}
        <div className="space-y-3">
          {recentLaws.map((law) => (
            <div key={law.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-900">{law.title}</h4>
                {law.category && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {law.category}
                  </span>
                )}
              </div>
              {law.reference_number && (
                <p className="mt-1 text-xs font-medium text-slate-500">{law.reference_number}</p>
              )}
              {(law.publication_date || law.effective_date || law.language) && (
                <p className="mt-1 text-xs text-slate-500">
                  {law.publication_date ? `Published ${law.publication_date}` : ''}
                  {law.publication_date && law.effective_date ? ' · ' : ''}
                  {law.effective_date ? `Effective ${law.effective_date}` : ''}
                  {law.language ? ` · ${law.language}` : ''}
                </p>
              )}
              {law.summary && <p className="mt-2 text-sm leading-6 text-slate-600">{law.summary}</p>}
              {law.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {law.tags.slice(0, 8).map((tag) => (
                    <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
