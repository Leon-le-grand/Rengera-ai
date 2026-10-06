'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyAndStoreLaw,
  getRecentLaws,
  type ClassificationStoreResult,
  type LawListItem,
} from '@/app/legal-actions';
import { Check, Database, FileJson, Loader2, Send, Upload, X } from 'lucide-react';

const MAX_BATCH = 10;

interface BatchJob {
  id: string;
  name: string;
  status: 'queued' | 'working' | 'done' | 'error';
  detail?: string;
}

export default function SupabaseLawClassifier() {
  const [rawText, setRawText] = useState('');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [result, setResult] = useState<ClassificationStoreResult | null>(null);
  const [recentLaws, setRecentLaws] = useState<LawListItem[]>([]);
  const [queryError, setQueryError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    );
    if (pdfs.length === 0) return;
    setPdfFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}-${file.size}`));
      const merged = [...current];
      for (const file of pdfs) {
        const key = `${file.name}-${file.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      return merged.slice(0, MAX_BATCH);
    });
  }, []);

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

    // Batch path: up to MAX_BATCH PDFs, stored one by one so each law gets
    // its own classification, hash, articles and alert row.
    if (pdfFiles.length > 0) {
      const batch = pdfFiles.slice(0, MAX_BATCH);
      setJobs(batch.map((file, index) => ({ id: `${index}-${file.name}`, name: file.name, status: 'queued' as const })));

      let done = 0;
      let failed = 0;
      for (let index = 0; index < batch.length; index += 1) {
        const file = batch[index];
        const jobId = `${index}-${file.name}`;
        setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, status: 'working' } : job)));

        const formData = new FormData();
        formData.set('rawText', '');
        formData.set('pdf', file);

        try {
          const stored = await classifyAndStoreLaw(formData);
          if (stored.success) {
            done += 1;
            setJobs((current) =>
              current.map((job) =>
                job.id === jobId
                  ? { ...job, status: 'done', detail: `${stored.articleCount ?? 0} articles` }
                  : job,
              ),
            );
          } else {
            failed += 1;
            setJobs((current) =>
              current.map((job) => (job.id === jobId ? { ...job, status: 'error', detail: stored.error } : job)),
            );
          }
        } catch (error) {
          failed += 1;
          setJobs((current) =>
            current.map((job) =>
              job.id === jobId
                ? { ...job, status: 'error', detail: error instanceof Error ? error.message : 'Classification failed.' }
                : job,
            ),
          );
        }
      }

      setResult({
        success: failed === 0,
        articleCount: done,
        warning: failed > 0 ? `${done} stored, ${failed} failed. See per-file status below.` : undefined,
        error: failed > 0 && done === 0 ? 'None of the PDFs could be stored. See per-file status below.' : undefined,
      });
      setPdfFiles([]);
      await loadRecentLaws();
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.set('rawText', rawText);

    try {
      const storedResult = await classifyAndStoreLaw(formData);
      setResult(storedResult);
      if (storedResult.success) {
        setRawText('');
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

  const removeFile = (index: number) => {
    setPdfFiles((current) => current.filter((_, i) => i !== index));
  };

  // Drops anywhere outside the form (or on the textarea, whose default would
  // navigate the browser to the PDF) must never leave the page.
  useEffect(() => {
    const guard = (event: DragEvent) => event.preventDefault();
    window.addEventListener('dragover', guard);
    window.addEventListener('drop', guard);
    return () => {
      window.removeEventListener('dragover', guard);
      window.removeEventListener('drop', guard);
    };
  }, []);

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
              Upload up to {MAX_BATCH} official PDFs at once. Title, law number, dates, language,
              source, and category are classified automatically, one law at a time.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          onDragEnter={(event) => {
            event.preventDefault();
            if (event.dataTransfer.types.includes('Files')) setDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(false);
            addFiles(event.dataTransfer.files);
          }}
        >
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

          <div
            role="button"
            tabIndex={0}
            aria-label={`Drop PDFs anywhere in this form or click to browse (up to ${MAX_BATCH} at once)`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-6 text-sm font-semibold transition ${
              dragActive
                ? 'border-blue-600 bg-blue-100/70 text-blue-900'
                : 'border-blue-300 bg-blue-50/60 text-blue-800 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <Upload size={18} />
            <span>
              {dragActive
                ? 'Drop the PDFs to add them'
                : pdfFiles.length > 0
                  ? `${pdfFiles.length} PDF${pdfFiles.length === 1 ? '' : 's'} selected (max ${MAX_BATCH} per batch) — drag more anywhere below or click to browse`
                  : `Drag official legal PDFs anywhere in this form, or click to browse (up to ${MAX_BATCH} at once)`}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.currentTarget.files || []);
                event.currentTarget.value = '';
              }}
            />
          </div>

          {pdfFiles.length > 0 && (
            <ul className="space-y-2">
              {pdfFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{file.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {jobs.length > 0 && (
            <ul className="space-y-2" aria-live="polite">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {job.status === 'working' ? (
                    <Loader2 size={15} className="shrink-0 animate-spin text-blue-600" />
                  ) : job.status === 'done' ? (
                    <Check size={15} strokeWidth={3} className="shrink-0 text-emerald-600" />
                  ) : job.status === 'error' ? (
                    <X size={15} strokeWidth={3} className="shrink-0 text-red-600" />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{job.name}</span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      job.status === 'done'
                        ? 'text-emerald-700'
                        : job.status === 'error'
                          ? 'text-red-700'
                          : job.status === 'working'
                            ? 'text-blue-700'
                            : 'text-slate-400'
                    }`}
                  >
                    {job.status === 'working'
                      ? 'Classifying…'
                      : job.status === 'done'
                        ? job.detail || 'Stored'
                        : job.status === 'error'
                          ? job.detail || 'Failed'
                          : 'Queued'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (pdfFiles.length === 0 && rawText.trim().length < 50)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {isSubmitting
              ? 'Classifying and storing…'
              : pdfFiles.length > 0
                ? `Classify and store ${Math.min(pdfFiles.length, MAX_BATCH)} PDF${Math.min(pdfFiles.length, MAX_BATCH) === 1 ? '' : 's'}`
                : 'Classify and store in Supabase'}
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
                  {result.classification
                    ? `Law classified and stored successfully. ${result.articleCount ?? 0} exact article${result.articleCount === 1 ? '' : 's'} indexed.`
                    : `Batch complete: ${result.articleCount ?? 0} stored.${result.warning ? ` ${result.warning}` : ''}`}
                </p>
                <dl className="mt-3 space-y-1 font-mono text-xs leading-5 text-emerald-900">
                  {result.contentHash && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-sans font-semibold">Text SHA-256:</dt>
                      <dd className="break-all">{result.contentHash}</dd>
                    </div>
                  )}
                  {result.pdfSha256 && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-sans font-semibold">PDF SHA-256:</dt>
                      <dd className="break-all">{result.pdfSha256}</dd>
                    </div>
                  )}
                  {result.coveragePercent !== null && result.coveragePercent !== undefined && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-sans font-semibold">Coverage:</dt>
                      <dd>
                        {result.coveragePercent}% of extracted text preserved in articles
                      </dd>
                    </div>
                  )}
                </dl>
                {result.classification && (
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 font-mono text-xs leading-5">
                  {JSON.stringify(result.classification, null, 2)}
                </pre>
                )}
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
