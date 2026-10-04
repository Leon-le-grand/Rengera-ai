'use client';

import ReactMarkdown from 'react-markdown';
import { BookOpen, ShieldCheck, Scale } from 'lucide-react';
import type { SharedConsultation } from '@/app/share-actions';

export default function ShareConsultationView({
  consultation,
}: {
  consultation: SharedConsultation;
}) {
  return (
    <article className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          The question
        </p>
        <h1 className="text-lg font-bold leading-snug text-slate-900">
          {consultation.question}
        </h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="markdown-body">
          <ReactMarkdown
            components={{
              h3: ({ node, ...props }) => (
                <h3
                  className="mt-6 mb-2 border-b border-emerald-100 pb-1 text-sm font-bold uppercase tracking-wider text-emerald-700"
                  {...props}
                />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-4 text-[15px] leading-relaxed text-slate-700" {...props} />
              ),
              ul: ({ node, ...props }) => <ul className="mb-4 space-y-2" {...props} />,
              li: ({ node, ...props }) => (
                <li className="flex items-start gap-2 text-[15px] text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{props.children}</span>
                </li>
              ),
              a: ({ node, ...props }) => (
                <a
                  className="font-medium text-emerald-700 underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer noopener"
                  {...props}
                />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-slate-900" {...props} />
              ),
            }}
          >
            {consultation.answer}
          </ReactMarkdown>
        </div>
      </div>

      {consultation.sources.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <BookOpen size={14} />
            Sources in the law library
          </p>
          <ul className="space-y-2">
            {consultation.sources.map((source, index) => (
              <li
                key={`${source.lawId}-${source.articleNumber}-${index}`}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <Scale size={14} className="shrink-0 text-emerald-600" />
                <span className="min-w-0 truncate text-slate-700">
                  {source.referenceNumber || source.title}
                </span>
                {source.articleNumber && (
                  <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Art. {source.articleNumber}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        This is legal education, not legal advice. Check the cited article yourself and
        confirm with an official source before acting.
      </p>
    </article>
  );
}