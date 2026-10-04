'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { submitAnswerFeedback } from '@/app/product-actions';
import { UI_STRINGS, type AnswerLanguage } from '@/lib/answer-language';
import { cn } from '@/lib/utils';

const NEGATIVE_REASONS = [
  'The law cited is wrong',
  'Too complicated to understand',
  'It did not answer my question',
  'The law looks outdated',
  'It ignored my situation',
  'Something here could put me in danger',
];

/**
 * The quality loop. A rating on its own is noise; a rating plus a reason lands in
 * the admin review queue, which is what turns user traffic into a maintained
 * knowledge base.
 */
export default function AnswerFeedback({
  messageId,
  question,
  citedLaws = [],
  language = 'en',
  className,
}: {
  messageId: string;
  question: string;
  citedLaws?: string[];
  language?: AnswerLanguage;
  className?: string;
}) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const strings = UI_STRINGS[language];

  const send = async (next: { rating: 1 | -1; reason?: string | null; comment?: string | null }) => {
    setSaving(true);
    try {
      await submitAnswerFeedback({
        messageId,
        rating: next.rating,
        reason: next.reason ?? null,
        comment: next.comment ?? null,
        question,
        citedLaws,
      });
    } catch (error) {
      console.error('Feedback could not be sent:', error);
    } finally {
      setSaving(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <p className={cn('text-[12px] text-[#5f6368]', className)}>{strings.thanks}</p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#80868b]">
          {rating === null ? 'Was this answer useful?' : strings.thanks}
        </span>

        <button
          type="button"
          aria-label={strings.helpful}
          aria-pressed={rating === 1}
          disabled={saving}
          onClick={() => {
            setRating(1);
            void send({ rating: 1 });
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 disabled:opacity-50',
            rating === 1
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
              : 'border-[#e8eaed] bg-white text-[#9aa0a6] hover:text-emerald-600',
          )}
        >
          <ThumbsUp size={13} strokeWidth={2} />
        </button>

        <button
          type="button"
          aria-label={strings.notHelpful}
          aria-pressed={rating === -1}
          disabled={saving}
          onClick={() => setRating(-1)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 disabled:opacity-50',
            rating === -1
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-[#e8eaed] bg-white text-[#9aa0a6] hover:text-red-500',
          )}
        >
          <ThumbsDown size={13} strokeWidth={2} />
        </button>
      </div>

      {rating === -1 && (
        <div className="flex flex-col gap-1.5 rounded-[14px] border border-[#f1c7c7] bg-[#fdf2f2] p-3">
          <p className="text-[12px] font-medium text-[#a50e0e]">What went wrong?</p>
          <div className="flex flex-wrap gap-1.5">
            {NEGATIVE_REASONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setReason(option);
                  void send({ rating: -1, reason: option, comment });
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  reason === option
                    ? 'border-red-300 bg-white text-[#a50e0e]'
                    : 'border-[#f1c7c7] bg-white/70 text-[#c5221f] hover:bg-white',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Tell us what the correct answer should have been…"
            rows={2}
            className="mt-1 w-full resize-none rounded-[10px] border border-[#f1c7c7] bg-white p-2 text-[12px] text-[#1f1f1f] outline-none placeholder:text-[#9aa0a6]"
          />
          <button
            type="button"
            disabled={saving || !comment.trim()}
            onClick={() => void send({ rating: -1, reason, comment })}
            className="self-end rounded-full bg-[#c5221f] px-3 py-1.5 text-[11px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            Send report
          </button>
        </div>
      )}
    </div>
  );
}