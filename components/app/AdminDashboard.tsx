'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Database,
  FileJson,
  Globe,
  Loader2,
  Megaphone,
  MessageSquareWarning,
  Pencil,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import SupabaseLawClassifier from './SupabaseLawClassifier';
import AdminEditLaw from './AdminEditLaw';
import { getLawLibrary, type LawLibraryEntry } from '@/app/legal-actions';
import { getAdminLibraryStats } from '@/app/share-actions';
import {
  getFeedbackDigest,
  getUsageAnalytics,
  syncLawChangeAlerts,
  type FeedbackDigestEntry,
  type UsageAnalytics,
} from '@/app/product-actions';
import { LANGUAGE_DEFINITIONS, type AnswerLanguage } from '@/lib/answer-language';

type AdminTab = 'overview' | 'ingest' | 'quality' | 'library';

const TABS: { id: AdminTab; label: string; icon: typeof Database }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'ingest', label: 'Law ingestion', icon: Database },
  { id: 'quality', label: 'Answer quality', icon: MessageSquareWarning },
  { id: 'library', label: 'Library corrections', icon: BookOpen },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [laws, setLaws] = useState<LawLibraryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminLibraryStats>>>(null);
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDigestEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState('');

  const loadLaws = useCallback(async () => {
    try {
      const groups = await getLawLibrary();
      setLaws(groups.flatMap((group) => group.laws));
    } catch {
      // The classifier below reports its own errors; here we just stay empty.
    }
  }, []);

  const loadInsights = useCallback(async () => {
    const [usage, digest] = await Promise.all([getUsageAnalytics(30), getFeedbackDigest(12)]);
    if (usage.analytics) setAnalytics(usage.analytics);
    if (digest.success) setFeedback(digest.feedback);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadLaws(), getAdminLibraryStats().then(setStats)]);
      setIsLoading(false);
    })();
  }, [loadLaws]);

  useEffect(() => {
    if (tab === 'overview' || tab === 'quality') void loadInsights();
  }, [tab, loadInsights]);

  const editingLaw = laws.find((law) => law.id === editingId) || null;

  const runLawChangeSync = async () => {
    setSyncing(true);
    setSyncNote('');
    try {
      const result = await syncLawChangeAlerts();
      setSyncNote(
        result.success
          ? `${result.created} new law update${result.created === 1 ? '' : 's'} published to citizens.`
          : 'The law update scan could not run.',
      );
    } finally {
      setSyncing(false);
    }
  };

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

  const peakDay = analytics?.daily.reduce((max, day) => Math.max(max, day.questions), 0) || 1;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Database size={22} />
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileJson size={14} />
              Operations console
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Rengera AI administration</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Ingest official law, watch how citizens use it, and fix what the model gets wrong.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runLawChangeSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} strokeWidth={2.25} />
          )}
          Scan for law changes
        </button>
      </div>

      {syncNote && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Megaphone size={15} />
          {syncNote}
        </p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <item.icon size={15} strokeWidth={2} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
              <Database size={14} />
              Knowledge base
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={MessageSquareWarning}
              tone="blue"
              label="Questions (30 days)"
              value={analytics?.questions ?? null}
              hint={analytics ? `${analytics.avgQuestionsPerDay} per active day` : 'Run migration 011 to see this'}
            />
            <MetricCard
              icon={Users}
              tone="emerald"
              label="Active sessions"
              value={analytics?.activeSessions ?? null}
              hint={analytics ? `${analytics.uniqueDays} days with traffic` : undefined}
            />
            <MetricCard
              icon={ThumbsUp}
              tone="indigo"
              label="Answer satisfaction"
              value={analytics?.satisfactionRate ?? null}
              suffix="%"
              hint="Share of 👍 on delivered answers"
            />
            <MetricCard
              icon={Activity}
              tone="amber"
              label="Answers delivered"
              value={analytics?.answers ?? null}
              hint={analytics ? `${analytics.totalEvents} total events logged` : undefined}
            />
          </section>

          {analytics && analytics.daily.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <BarChart3 size={18} className="text-slate-400" />
                Questions per day
              </h2>
              <div className="mt-6 flex h-40 items-end gap-1.5">
                {analytics.daily.slice(-30).map((day) => (
                  <div key={day.day} className="group flex flex-1 flex-col items-center gap-1">
                    <div
                      title={`${day.day}: ${day.questions} questions`}
                      className="w-full rounded-t-md bg-slate-900/85 transition-all duration-300 group-hover:bg-emerald-500"
                      style={{ height: `${Math.max(4, (day.questions / peakDay) * 130)}px` }}
                    />
                    <span className="text-[9px] text-slate-400">{day.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Globe size={18} className="text-slate-400" />
                Languages in use
              </h2>
              {analytics && analytics.languages.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {analytics.languages.map((row) => (
                    <li key={row.language} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        {LANGUAGE_DEFINITIONS[row.language as AnswerLanguage]?.native || row.language}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.round(
                                (row.count / Math.max(...analytics.languages.map((item) => item.count))) * 100,
                              )}%`,
                            }}
                          />
                        </span>
                        <span className="w-6 text-right text-xs font-bold text-slate-500">{row.count}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Language mix appears once citizens start asking questions.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <BookOpen size={18} className="text-slate-400" />
                Most asked about
              </h2>
              {analytics && analytics.topCategories.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {analytics.topCategories.map((row) => (
                    <li
                      key={row.category}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-700">{row.category}</span>
                      <span className="text-xs font-bold text-slate-500">{row.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Topic breakdown appears once question events carry a category.
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Ingestion */}
      {tab === 'ingest' && <SupabaseLawClassifier />}

      {/* Answer quality */}
      {tab === 'quality' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">What citizens told us</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Every 👍 and 👎 lands here with a reason. A 👎 is a bug report: open the law, correct the
              classification, and the Verified badge appears on that citation for everyone.
            </p>
          </div>

          {feedback.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No feedback yet. Ratings start appearing as soon as citizens rate an answer.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {feedback.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        entry.rating === 1
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {entry.rating === 1 ? (
                        <ThumbsUp size={12} />
                      ) : (
                        <ThumbsDown size={12} />
                      )}
                      {entry.rating === 1 ? 'Helpful' : 'Not helpful'}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>

                  {entry.question && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-700">“{entry.question}”</p>
                  )}
                  {entry.reason && (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {entry.reason}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {entry.comment}
                    </p>
                  )}
                  {entry.cited_laws.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.cited_laws.slice(0, 4).map((law) => (
                        <span
                          key={law}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {law}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Library corrections */}
      {tab === 'library' && (
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-3 text-lg font-bold text-slate-950">
              <BookOpen size={20} className="text-emerald-600" />
              Correct a classification
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The AI classifies on first upload and sometimes gets the category, status, or article
              references wrong. Open a law below to correct the metadata. The source text and the stored
              PDF are never changed.
            </p>
          </div>

          {editingLaw && <AdminEditLaw law={editingLaw} onSaved={loadLaws} />}

          {isLoading ? (
            <div className="flex items-center gap-3 py-8 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <p className="text-sm font-medium">Loading the stored laws…</p>
            </div>
          ) : laws.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No laws stored yet. Upload a PDF in Law ingestion and it will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {laws.map((law) => (
                <div
                  key={law.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
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
      )}
    </div>
  );
}

const METRIC_TONES = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
} as const;

function MetricCard({
  icon: Icon,
  tone,
  label,
  value,
  suffix,
  hint,
}: {
  icon: typeof Activity;
  tone: keyof typeof METRIC_TONES;
  label: string;
  value: number | null;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <span
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${METRIC_TONES[tone]}`}
      >
        <Icon size={19} strokeWidth={2} />
      </span>
      <p className="text-2xl font-bold text-slate-900">
        {value === null ? '—' : value}
        {value !== null && suffix ? <span className="text-base text-slate-400">{suffix}</span> : null}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
