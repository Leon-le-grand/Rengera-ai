'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { analyzeContract, type ContractReview } from '@/app/product-actions';
import LanguageMenu, { useStoredLanguage } from '@/components/chat/LanguageMenu';

const SEVERITY_STYLES = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
} as const;

export default function BusinessDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'hr' | 'contracts' | 'reports'>('contracts');
  const [language, setLanguage] = useStoredLanguage();
  const [review, setReview] = useState<ContractReview | null>(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = async (file: File) => {
    setError('');
    setIsAnalyzing(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    try {
      const result = await analyzeContract(formData);
      if (!result.success || !result.review) {
        setError(result.error || 'The document could not be reviewed.');
        setReview(null);
      } else {
        setReview(result.review);
      }
    } catch (caught) {
      console.error(caught);
      setError('The document could not be reviewed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-surface mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Briefcase className="text-blue-600" size={24} />
            Kigali Tech Hub Ltd.
          </h1>
          <p className="mt-1 text-slate-500">Compliance workspace for Rwandan SMEs</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageMenu value={language} onChange={setLanguage} />
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            Active
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'hr', label: 'HR & Employees' },
          { id: 'contracts', label: 'Contract Analysis' },
          { id: 'reports', label: 'Compliance Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contracts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="text-lg font-bold text-slate-900">Review a contract or notice</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Upload an employment contract, a tenancy agreement or a court notice. Rengera reads it
                  against current Rwandan law and flags what is unlawful, missing or risky.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Your document is parsed in memory only. It is never stored, never added to the
                  transcript, and never used to train anything.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,text/plain,.doc,.docx"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void runAnalysis(file);
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} strokeWidth={2.25} />
                  )}
                  {isAnalyzing ? 'Reading the document…' : 'Choose a document'}
                </button>
                {fileName && !isAnalyzing && (
                  <span className="max-w-[220px] truncate text-xs text-slate-400">{fileName}</span>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}
          </div>

          {review && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  icon={FileText}
                  tone="blue"
                  value={String(review.findings.length)}
                  label="Risk findings"
                />
                <StatCard
                  icon={ShieldCheck}
                  tone="emerald"
                  value={String(review.positives.length)}
                  label="Clauses in your favour"
                />
                <StatCard
                  icon={CheckCircle}
                  tone="indigo"
                  value={String(review.nextSteps.length)}
                  label="Next steps"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{review.documentType}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{review.summary}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Risk findings</h3>
                {review.findings.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nothing unlawful stood out in this document against the law we retrieved. A lawyer
                    should still confirm anything with a financial penalty attached.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {review.findings.map((finding, index) => (
                      <li
                        key={`${finding.title}-${index}`}
                        className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
                              SEVERITY_STYLES[finding.severity]
                            }`}
                          >
                            {finding.severity}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{finding.title}</h4>
                          {finding.lawReference && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {finding.lawReference}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{finding.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-lg font-bold text-slate-900">In your favour</h3>
                  <ul className="space-y-2">
                    {review.positives.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm leading-6 text-slate-600">
                        <CheckCircle size={15} className="mt-1 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-lg font-bold text-slate-900">Do this next</h3>
                  <ol className="space-y-2">
                    {review.nextSteps.map((item, index) => (
                      <li key={index} className="flex gap-3 text-sm leading-6 text-slate-600">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                          {index + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Export this review as PDF
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Compliance report</h2>
            <p className="mt-1 text-sm text-slate-500">
              {review
                ? 'The most recent contract review, ready to hand to your lawyer or auditor.'
                : 'Run a contract review first and the report builds itself from the findings.'}
            </p>

            {review && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  icon={AlertTriangle}
                  tone={review.findings.some((item) => item.severity === 'high') ? 'red' : 'amber'}
                  value={String(review.findings.filter((item) => item.severity === 'high').length)}
                  label="High severity issues"
                />
                <StatCard
                  icon={Building}
                  tone="blue"
                  value={review.documentType.split(' ').slice(0, 3).join(' ')}
                  label="Document type"
                />
                <StatCard
                  icon={Users}
                  tone="indigo"
                  value={String(review.nextSteps.length)}
                  label="Actions to take"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ShieldCheck} tone="emerald" value="98%" label="Overall compliance score" />
            <StatCard icon={Users} tone="blue" value="42" label="Active employees" />
            <StatCard
              icon={AlertTriangle}
              tone="amber"
              value={String(review?.findings.length ?? 0)}
              label="Open contract findings"
            />
            <StatCard icon={FileText} tone="indigo" value="12" label="Active policies" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Recent alerts</h3>
            <div className="flex gap-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Law N° 058/2021 — personal data protection
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  Employee data consent forms should match the current wording before your next audit.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'hr' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">HR & employees</h2>
            <p className="mt-1 text-sm text-slate-500">
              Contracts, leave and overtime questions for your team run through the same assistant —
              ask in the chat and the answer cites the article.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-600',
} as const;

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: typeof FileText;
  tone: keyof typeof TONES;
  value: string;
  label: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="truncate text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
    </div>
  );
}
