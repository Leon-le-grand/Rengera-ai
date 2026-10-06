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
    <article className="space-y-5">
      <div className="rounded-[3px] border border-zinc-950/10 bg-[#f7f6f3] p-5 shadow-[0_2px_12px_-6px_rgba(24,24,27,0.25)]">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">
          The question
        </p>
        <h1 className="text-lg font-bold leading-snug text-zinc-950">
          {consultation.question}
        </h1>
      </div>

      <div className="rounded-[3px] border border-zinc-950/10 bg-[#f7f6f3] p-5 shadow-[0_2px_12px_-6px_rgba(24,24,27,0.25)]">
        <div className="markdown-body">
          <ReactMarkdown
            components={{
              h3: ({ node, ...props }) => (
                <h3
                  className="mt-6 mb-2 border-b border-[#d8b485]/40 pb-1 text-sm font-extrabold uppercase tracking-wider text-[#8a6a30]"
                  {...props}
                />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-4 text-[15px] font-medium leading-relaxed text-zinc-800" {...props} />
              ),
              ul: ({ node, ...props }) => <ul className="mb-4 space-y-2" {...props} />,
              li: ({ node, ...props }) => (
                <li className="flex items-start gap-2 text-[15px] font-medium text-zinc-800">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a6a30]" />
                  <span>{props.children}</span>
                </li>
              ),
              a: ({ node, ...props }) => (
                <a
                  className="font-semibold text-[#8a6a30] underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer noopener"
                  {...props}
                />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-zinc-950" {...props} />
              ),
            }}
          >
            {consultation.answer}
          </ReactMarkdown>
        </div>
      </div>

      {consultation.sources.length > 0 && (
        <div className="rounded-[3px] border border-zinc-950/10 bg-[#f7f6f3] p-5 shadow-[0_2px_12px_-6px_rgba(24,24,27,0.25)]">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">
            <BookOpen size={14} />
            Sources in the law library
          </p>
          <ul className="space-y-2">
            {consultation.sources.map((source, index) => (
              <li
                key={`${source.lawId}-${source.articleNumber}-${index}`}
                className="flex items-center gap-2 rounded-[3px] bg-[#efede9] px-3 py-2 text-sm font-medium"
              >
                <Scale size={14} className="shrink-0 text-[#8a6a30]" />
                <span className="min-w-0 truncate text-zinc-800">
                  {source.referenceNumber || source.title}
                </span>
                {source.articleNumber && (
                  <span className="shrink-0 rounded-[3px] bg-[#f7f6f3] px-1.5 py-0.5 text-xs font-bold text-[#8a6a30] ring-1 ring-[#d8b485]/50">
                    Art. {source.articleNumber}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-[3px] border border-[#d8b485]/50 bg-[#d8b485]/10 p-4 text-xs font-medium leading-5 text-zinc-800">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#8a6a30]" />
        This is legal education, not legal advice. Check the cited article yourself and
        confirm with an official source before acting.
      </p>
    </article>
  );
}