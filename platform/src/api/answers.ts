import type {
  AnswerEvidence,
  AnswerOutcome,
  AnswerRequest,
  AnswerResponse,
  LawStatus,
  ReviewStatus,
} from './types';
import { apiFetch } from './client';
import {
  asArray,
  asBoolean,
  asRawString,
  asRecord,
  asString,
  asStringArray,
  unwrapData,
} from './parse-utils';
import {
  isAnswerLanguage,
  type AnswerLanguage,
} from '@/i18n/languages';

function normalizeLawStatus(value: unknown): LawStatus {
  if (value === 'active' || value === 'in_force') return 'active';
  if (value === 'amended') return 'amended';
  if (value === 'repealed') return 'repealed';
  return 'unknown';
}

function normalizeReviewStatus(value: unknown): ReviewStatus {
  return value === 'reviewed' ||
    value === 'pending' ||
    value === 'unavailable' ||
    value === 'unknown'
    ? value
    : 'unknown';
}

function normalizeEvidence(value: unknown): AnswerEvidence | null {
  const record = asRecord(value);
  if (!record) return null;

  const nestedLaw = asRecord(record.law);
  const lawId =
    asString(record.law_id) ??
    asString(record.lawId) ??
    (nestedLaw ? asString(nestedLaw.id) : null);
  const lawTitle =
    asString(record.law_title) ??
    asString(record.lawTitle) ??
    (nestedLaw ? asString(nestedLaw.title) : null) ??
    asString(record.title);

  const articleNumber =
    asString(record.article_number) ?? asString(record.articleNumber);
  const excerpt =
    asRawString(record.excerpt) ??
    asRawString(record.snippet) ??
    asRawString(record.text) ??
    asRawString(record.content);
  const citation = asString(record.citation);

  if (!lawId && !lawTitle && !articleNumber && !citation && excerpt === null) {
    return null;
  }

  return {
    law_id: lawId,
    law_title: lawTitle,
    reference_number:
      asString(record.reference_number) ?? asString(record.reference),
    article_number: articleNumber,
    article_title:
      asString(record.article_title) ?? asString(record.articleTitle),
    citation,
    excerpt,
    status: normalizeLawStatus(record.status ?? record.law_status),
    review_status: normalizeReviewStatus(
      record.review_status ?? record.reviewStatus,
    ),
    source_url: asString(record.source_url),
  };
}

function answerText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() ? value : null;
  const record = asRecord(value);
  if (!record) return null;
  const text = asRawString(record.text) ?? asRawString(record.content);
  return text && text.trim() ? text : null;
}

function outcomeFrom(value: unknown): AnswerOutcome | null {
  switch (value) {
    case 'answered':
    case 'success':
    case 'ok':
      return 'answered';
    case 'abstained':
    case 'no_answer':
    case 'no_sources':
    case 'insufficient_sources':
      return 'abstained';
    case 'urgent':
    case 'emergency':
      return 'urgent';
    case 'greeting':
      return 'greeting';
    case 'help':
      return 'help';
    case 'unavailable':
    case 'error':
    case 'failed':
    case 'queued':
    case 'pending':
      return 'unavailable';
    default:
      return null;
  }
}

function abstentionLimitation(reason: string): string {
  if (reason === 'no_evidence') {
    return 'No stored source matched the question, so no answer was generated.';
  }
  if (reason.startsWith('citation') || reason.includes('citation')) {
    return 'The generated answer could not be verified against the cited source text.';
  }
  return 'The service declined to answer from the available sources.';
}

/**
 * Normalizes the synchronous answer contract and tolerates documented
 * camelCase/snake_case aliases while the generated client is pending. A 2xx
 * response that cannot be understood becomes an honest `unavailable` result,
 * never a fabricated answer or abstention.
 */
export function normalizeAnswerResponse(
  payload: unknown,
  request: AnswerRequest,
): AnswerResponse {
  const root = asRecord(unwrapData(payload));
  const language = isAnswerLanguage(asRecord(root)?.language)
    ? (root?.language as AnswerLanguage)
    : request.language;

  if (!root) {
    return {
      outcome: 'unavailable',
      answer: null,
      evidence: [],
      limitations: [],
      request_id: null,
      language,
      notice:
        'The answer service returned a response this build could not read.',
    };
  }

  const rawSources =
    asArray(root.evidence) ??
    asArray(root.sources) ??
    asArray(root.citations) ??
    asArray(asRecord(root.answer)?.sources) ??
    [];
  const evidence = rawSources
    .map((value) => normalizeEvidence(value))
    .filter((value): value is AnswerEvidence => value !== null);

  const answer = answerText(root.answer ?? root.text ?? root.content);
  const urgent =
    asBoolean(root.urgent) ??
    asBoolean(asRecord(root.safety)?.urgent) ??
    false;
  const abstained = asBoolean(root.abstained) ?? false;
  const declaredOutcome = outcomeFrom(
    root.outcome ??
      root.kind ??
      root.status ??
      asRecord(root.result)?.status,
  );

  let outcome: AnswerOutcome;
  if (urgent || declaredOutcome === 'urgent') {
    outcome = 'urgent';
  } else if (abstained || declaredOutcome === 'abstained') {
    outcome = 'abstained';
  } else if (
    declaredOutcome === 'greeting' ||
    declaredOutcome === 'help'
  ) {
    outcome = declaredOutcome;
  } else if (declaredOutcome === 'unavailable') {
    outcome = 'unavailable';
  } else if (answer) {
    outcome = 'answered';
  } else if (evidence.length > 0) {
    outcome = 'abstained';
  } else {
    outcome = 'unavailable';
  }

  if (outcome === 'answered' && !answer) {
    outcome = 'unavailable';
  }

  const limitations = asStringArray(root.limitations);
  const abstentionReason = asString(root.abstention_reason);
  if (limitations.length === 0 && abstentionReason) {
    limitations.push(abstentionLimitation(abstentionReason));
  }

  const notice =
    asString(root.notice) ??
    asString(root.message) ??
    (outcome === 'answered' ? asString(root.disclaimer) : null) ??
    (outcome === 'unavailable'
      ? 'The answer service did not return a usable answer. Try again or read the sources in the law library.'
      : null);

  return {
    outcome,
    answer,
    evidence,
    limitations,
    request_id:
      asString(root.request_id) ?? asString(root.requestId),
    language,
    notice,
  };
}

export async function requestAnswer(
  request: AnswerRequest,
  signal?: AbortSignal,
): Promise<AnswerResponse> {
  const payload = await apiFetch<unknown>('/v1/answers', {
    method: 'POST',
    body: request,
    signal,
  });
  return normalizeAnswerResponse(payload, request);
}
