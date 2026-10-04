'use client';

import { useEffect, useState } from 'react';
import { Database, FileJson, BookOpen, Pencil, Loader2 } from 'lucide-react';
import SupabaseLawClassifier from './SupabaseLawClassifier';
import AdminEditLaw from './AdminEditLaw';
import { getLawLibrary, type LawLibraryEntry } from '@/app/legal-actions';
import { getAdminLibraryStats } from '@/app/share-actions';

export default function AdminDashboard() {
  const [laws, setLaws] = useState<LawLibraryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminLibraryStats>>>(null);

  const loadLaws = async () => {
    try {
      const groups = await getLawLibrary();
      setLaws(groups.flatMap((group) => group.laws));
    } catch {
      // The classifier below reports its own errors; here we just stay empty.
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadLaws(), getAdminLibraryStats().then(setStats)]);
      setIsLoading(false);
    })();
  }, []);

  const editingLaw = laws.find((law) => law.id === editingId) || null;

  const statCards = stats
    ? [
        { label: 'Laws stored', value: stats.total_laws },
        { label: 'Articles indexed', value: stats.total_articles },
        { label: 'Original PDFs', value: stats.stored_pdfs },
        { label: 'Amendments', value: stats.amendments },
        { label: 'Reviewed by a human', value: stats.reviewed_laws },
        { label: 'Awaiting review', value: stats.pending_laws },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Database size={24} />
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
            <FileJson size={14} />
            Supabase legal knowledge base
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Upload and classify official law</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Upload one PDF. RENGERA AI extracts and classifies the metadata, preserves the full
            extracted text, and stores everything in Supabase.
          </p>
        </div>
      </div>

      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <SupabaseLawClassifier />

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-950">Correct a classification</h2>
        </div>

        <p className="text-sm leading-6 text-slate-500">
          The AI classifies on first upload and sometimes gets the category, status, or article
          references wrong. Open a law below to correct the metadata. The source text and the
          stored PDF are never changed.
        </p>

        {editingLaw && (
          <AdminEditLaw
            law={editingLaw}
            onSaved={() => {
              loadLaws();
            }}
          />
        )}

        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-sm font-medium">Loading the stored laws…</p>
          </div>
        ) : laws.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No laws stored yet. Upload a PDF above and it will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {laws.map((law) => (
              <div
                key={law.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{law.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {law.reference_number || 'No reference'}
                    {law.category ? ` · ${law.category}` : ''}
                    {` · ${law.article_count} article${law.article_count === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId((current) => (current === law.id ? null : law.id))}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
                >
                  <Pencil size={14} />
                  {editingId === law.id ? 'Close' : 'Edit'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
