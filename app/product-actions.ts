'use server';

import { getAdminSession } from '@/lib/auth';
import { extractPdfText, normalizePdfText } from '@/lib/legal-pdf';
import { retrieveSupabaseLegalContext } from '@/lib/supabase-retrieval';
import { getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { createSpaceBunnyChatCompletion } from '@/lib/space-bunny';
import { LANGUAGE_DEFINITIONS, resolveAnswerLanguage } from '@/lib/answer-language';

/**
 * Product-layer actions: the quality loop, deadlines, usage analytics,
 * law-change alerts and business contract review.
 *
 * Every write goes through the service-role client, and the matching tables have
 * RLS enabled with no public policies (migration 011), so the browser key can
 * never read a citizen's question, deadline or document.
 *
 * Every function degrades quietly: if Supabase is not configured or a table has
 * not been migrated yet, the UI keeps working from local state instead of
 * throwing. Nothing here should ever break an answer.
 */

function db() {
  return isSupabaseConfigured() ? getSupabaseAdminClient() : null;
}

function ok<T extends Record<string, unknown>>(payload: T) {
  return { success: true as const, ...payload };
}

function fail(error: string) {
  return { success: false as const, error };
}

/* ------------------------------------------------------------------ */
/* Usage events                                                        */
/* ------------------------------------------------------------------ */

export interface UsageEventInput {
  eventType: 'question_asked' | 'answer_given' | 'law_opened' | 'share_created' | 'contract_analyzed';
  category?: string | null;
  surface?: string | null;
  language?: string | null;
  query?: string | null;
  lawReferences?: string[];
  userId?: string | null;
  sessionId?: string | null;
}

export async function logUsageEvent(input: UsageEventInput) {
  const client = db();
  if (!client) return ok({ persisted: false });

  try {
    const { error } = await client.from('usage_events').insert({
      event_type: input.eventType,
      category: input.category ?? null,
      surface: input.surface ?? null,
      language: input.language ?? null,
      // Keep the stored question short: this table is analytics, not a transcript.
      query: (input.query || '').slice(0, 240) || null,
      law_references: input.lawReferences || [],
      user_id: input.userId ?? null,
      session_id: input.sessionId ?? null,
    });

    if (error) throw error;
    return ok({ persisted: true });
  } catch (caught) {
    console.error('logUsageEvent failed:', caught);
    return ok({ persisted: false });
  }
}

/* ------------------------------------------------------------------ */
/* Answer feedback — the quality loop                                   */
/* ------------------------------------------------------------------ */

export async function submitAnswerFeedback(input: {
  messageId: string;
  rating: 1 | -1;
  reason?: string | null;
  comment?: string | null;
  question?: string | null;
  citedLaws?: string[];
}) {
  const client = db();
  if (!client) return ok({ persisted: false });

  try {
    const { error } = await client.from('answer_feedback').insert({
      message_id: input.messageId,
      rating: input.rating,
      reason: input.reason ?? null,
      comment: (input.comment || '').slice(0, 800) || null,
      question: (input.question || '').slice(0, 400) || null,
      cited_laws: input.citedLaws || [],
    });

    if (error) throw error;
    return ok({ persisted: true });
  } catch (caught) {
    console.error('submitAnswerFeedback failed:', caught);
    return ok({ persisted: false });
  }
}

/* ------------------------------------------------------------------ */
/* Deadlines                                                            */
/* ------------------------------------------------------------------ */

export interface DeadlineRecord {
  id: string;
  label: string;
  note: string | null;
  due_date: string;
  status: 'open' | 'done';
  source_law_title: string | null;
  source_article: string | null;
}

export async function listDeadlines(): Promise<{ success: boolean; deadlines: DeadlineRecord[] }> {
  const client = db();
  if (!client) return { success: false, deadlines: [] };

  try {
    const { data, error } = await client
      .from('user_deadlines')
      .select('id, label, note, due_date, status, source_law_title, source_article')
      .order('due_date', { ascending: true })
      .limit(50);

    if (error) throw error;
    return { success: true, deadlines: (data || []) as DeadlineRecord[] };
  } catch (caught) {
    console.error('listDeadlines failed:', caught);
    return { success: false, deadlines: [] };
  }
}

export async function createDeadline(input: {
  label: string;
  note?: string | null;
  dueDate: string;
  sourceLawTitle?: string | null;
  sourceArticle?: string | null;
}) {
  const client = db();
  if (!client) return fail('Deadlines need the database to be connected.');

  try {
    const { error } = await client.from('user_deadlines').insert({
      label: input.label.slice(0, 160),
      note: input.note || null,
      due_date: input.dueDate,
      source_law_title: input.sourceLawTitle ?? null,
      source_article: input.sourceArticle ?? null,
    });

    if (error) throw error;
    return ok({ persisted: true });
  } catch (caught) {
    console.error('createDeadline failed:', caught);
    return fail('The reminder could not be saved.');
  }
}

export async function setDeadlineStatus(id: string, status: 'open' | 'done') {
  const client = db();
  if (!client) return ok({ persisted: false });

  try {
    const { error } = await client.from('user_deadlines').update({ status }).eq('id', id);
    if (error) throw error;
    return ok({ persisted: true });
  } catch (caught) {
    console.error('setDeadlineStatus failed:', caught);
    return ok({ persisted: false });
  }
}

export async function removeDeadline(id: string) {
  const client = db();
  if (!client) return ok({ persisted: false });

  try {
    const { error } = await client.from('user_deadlines').delete().eq('id', id);
    if (error) throw error;
    return ok({ persisted: true });
  } catch (caught) {
    console.error('removeDeadline failed:', caught);
    return ok({ persisted: false });
  }
}

/* ------------------------------------------------------------------ */
/* Analytics for the admin dashboard                                    */
/* ------------------------------------------------------------------ */

export interface UsageAnalytics {
  totalEvents: number;
  questions: number;
  answers: number;
  activeSessions: number;
  uniqueDays: number;
  avgQuestionsPerDay: number;
  satisfactionRate: number | null;
  topCategories: { category: string; count: number }[];
  languages: { language: string; count: number }[];
  daily: { day: string; questions: number; answers: number }[];
}

export async function getUsageAnalytics(days = 30): Promise<{ success: boolean; analytics: UsageAnalytics | null }> {
  const client = db();
  const empty: UsageAnalytics = {
    totalEvents: 0,
    questions: 0,
    answers: 0,
    activeSessions: 0,
    uniqueDays: 0,
    avgQuestionsPerDay: 0,
    satisfactionRate: null,
    topCategories: [],
    languages: [],
    daily: [],
  };

  if (!client) return { success: false, analytics: empty };
  if (!(await getAdminSession())) return { success: false, analytics: null };

  const since = new Date(Date.now() - Math.max(days, 1) * 86400000).toISOString();

  try {
    const [{ data: events }, { data: feedback }] = await Promise.all([
      client
        .from('usage_events')
        .select('event_type, category, language, session_id, created_at')
        .gte('created_at', since)
        .limit(5000),
      client.from('answer_feedback').select('rating').gte('created_at', since).limit(2000),
    ]);

    const rows = (events || []) as {
      event_type: string;
      category: string | null;
      language: string | null;
      session_id: string | null;
      created_at: string;
    }[];

    const byDay = new Map<string, { questions: number; answers: number }>();
    const byCategory = new Map<string, number>();
    const byLanguage = new Map<string, number>();
    const sessions = new Set<string>();
    const days = new Set<string>();
    let questions = 0;
    let answers = 0;

    for (const row of rows) {
      const day = String(row.created_at).slice(0, 10);
      days.add(day);
      if (row.session_id) sessions.add(row.session_id);

      const bucket = byDay.get(day) || { questions: 0, answers: 0 };
      if (row.event_type === 'question_asked') {
        questions += 1;
        bucket.questions += 1;
      }
      if (row.event_type === 'answer_given') {
        answers += 1;
        bucket.answers += 1;
      }
      byDay.set(day, bucket);

      if (row.category) byCategory.set(row.category, (byCategory.get(row.category) || 0) + 1);
      if (row.language) byLanguage.set(row.language, (byLanguage.get(row.language) || 0) + 1);
    }

    const ratings = (feedback || []) as { rating: number }[];
    const positive = ratings.filter((row) => row.rating === 1).length;

    return {
      success: true,
      analytics: {
        totalEvents: rows.length,
        questions,
        answers,
        activeSessions: sessions.size,
        uniqueDays: days.size,
        avgQuestionsPerDay: days.size ? Math.round((questions / days.size) * 10) / 10 : 0,
        satisfactionRate: ratings.length ? Math.round((positive / ratings.length) * 100) : null,
        topCategories: [...byCategory.entries()]
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        languages: [...byLanguage.entries()]
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count),
        daily: [...byDay.entries()]
          .map(([day, value]) => ({ day, ...value }))
          .sort((a, b) => a.day.localeCompare(b.day)),
      },
    };
  } catch (caught) {
    console.error('getUsageAnalytics failed:', caught);
    return { success: false, analytics: empty };
  }
}

export async function getFeedbackDigest(limit = 20) {
  const client = db();
  if (!client) return { success: false, feedback: [] as FeedbackDigestEntry[] };
  if (!(await getAdminSession())) return { success: false, feedback: [] };

  try {
    const { data, error } = await client
      .from('answer_feedback')
      .select('id, rating, reason, comment, question, cited_laws, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));

    if (error) throw error;
    return {
      success: true,
      feedback: (data || []) as FeedbackDigestEntry[],
    };
  } catch (caught) {
    console.error('getFeedbackDigest failed:', caught);
    return { success: false, feedback: [] };
  }
}

export interface FeedbackDigestEntry {
  id: string;
  rating: number;
  reason: string | null;
  comment: string | null;
  question: string | null;
  cited_laws: string[];
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Law-change alerts                                                    */
/* ------------------------------------------------------------------ */

export interface LawChangeAlert {
  id: string;
  law_title: string;
  law_reference: string | null;
  alert_type: string;
  summary: string | null;
  published_at: string | null;
  created_at: string;
}

/**
 * Reads published amendments out of the laws table and records an alert the first
 * time each one is seen, so citizens can be told when the law under them moved.
 */
export async function syncLawChangeAlerts(): Promise<{ success: boolean; created: number }> {
  const client = db();
  if (!client) return { success: false, created: 0 };

  try {
    const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);

    const { data, error } = await client
      .from('laws')
      .select('id, title, reference_number, amends_law_reference, summary, publication_date, effective_date, affected_articles')
      .not('amends_law_reference', 'is', null)
      .gte('publication_date', since)
      .limit(100);

    if (error) throw error;

    const amendments = (data || []) as {
      id: string;
      title: string;
      reference_number: string | null;
      amends_law_reference: string | null;
      summary: string | null;
      publication_date: string | null;
      effective_date: string | null;
      affected_articles: string[] | null;
    }[];

    if (amendments.length === 0) return { success: true, created: 0 };

    const { data: existing } = await client.from('law_change_alerts').select('law_id');
    const known = new Set(((existing || []) as { law_id: string }[]).map((row) => String(row.law_id)));

    const fresh = amendments
      .filter((row) => !known.has(String(row.id)))
      .map((row) => ({
        law_id: String(row.id),
        law_title: row.title,
        law_reference: row.reference_number,
        alert_type: 'amended',
        summary: [
          row.amends_law_reference ? `Amends ${row.amends_law_reference}` : null,
          row.affected_articles && row.affected_articles.length
            ? `Articles affected: ${row.affected_articles.join(', ')}`
            : null,
          row.effective_date ? `In force from ${row.effective_date}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || row.summary,
        published_at: row.publication_date,
      }));

    if (fresh.length === 0) return { success: true, created: 0 };

    const { error: insertError } = await client.from('law_change_alerts').insert(fresh);
    if (insertError) throw insertError;

    return { success: true, created: fresh.length };
  } catch (caught) {
    console.error('syncLawChangeAlerts failed:', caught);
    return { success: false, created: 0 };
  }
}

export async function getLawChangeAlerts(limit = 5): Promise<{ success: boolean; alerts: LawChangeAlert[] }> {
  const client = db();
  if (!client) return { success: false, alerts: [] };

  try {
    const { data, error } = await client
      .from('law_change_alerts')
      .select('id, law_title, law_reference, alert_type, summary, published_at, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 20));

    if (error) throw error;
    return { success: true, alerts: (data || []) as LawChangeAlert[] };
  } catch (caught) {
    console.error('getLawChangeAlerts failed:', caught);
    return { success: false, alerts: [] };
  }
}

/* ------------------------------------------------------------------ */
/* Business contract review                                             */
/* ------------------------------------------------------------------ */

export interface ContractFinding {
  title: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
  lawReference: string | null;
}

export interface ContractReview {
  documentType: string;
  summary: string;
  findings: ContractFinding[];
  positives: string[];
  nextSteps: string[];
}

const CONTRACT_SYSTEM_PROMPT = `You are Rengera's contract reviewer for Rwandan businesses.
You are given the text of a document the company received or signed, plus retrieved Rwandan law.

PRIVACY RULES (strict): the document is processed in memory only. Never repeat personal
identifiers such as national ID numbers, phone numbers, bank account numbers or home
addresses back to the user — refer to them as "the employee", "the landlord", "the party".

RULES:
- Only rely on the retrieved law. If the law is not in the context, say so.
- Flag clauses that are unlawful, unfair, missing or risky under Rwandan law.
- Be specific: name the clause, explain the risk, cite the article.

Answer with this exact markdown shape:

### Document type
(one line)

### Summary
(three sentences maximum)

### Risk findings
For each finding use:
- **[HIGH|MEDIUM|LOW] Clause name** — what is wrong or missing, and the law that applies.

### In your favour
- clauses that protect the company

### Do this next
- numbered steps, most urgent first`;

/**
 * Reviews an uploaded contract against Rwandan law.
 *
 * The uploaded file is parsed in memory and is never written to disk, Supabase
 * Storage or the transcript — only the resulting findings are returned.
 */
export async function analyzeContract(formData: FormData): Promise<{ success: boolean; review?: ContractReview; error?: string }> {
  const file = formData.get('file');
  const language = resolveAnswerLanguage(formData.get('language'));

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Choose a PDF or a text file first.' };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { success: false, error: 'That file is larger than 12 MB. Split it and try again.' };
  }

  let text = '';
  try {
    text =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        ? await extractPdfText(file)
        : await file.text();
  } catch (caught) {
    console.error('Contract text extraction failed:', caught);
    return { success: false, error: 'The file could not be read. If it is a scanned PDF, run OCR on it first.' };
  }

  text = normalizePdfText(text).slice(0, 20000);
  if (text.length < 120) {
    return { success: false, error: 'Almost no text was found in that document.' };
  }

  let contextText = 'No Rwandan law retrieved for this document.';
  if (isSupabaseConfigured()) {
    try {
      const retrieval = await retrieveSupabaseLegalContext(text.slice(0, 1500), 8);
      contextText = retrieval?.context || contextText;
    } catch (caught) {
      console.error('Contract retrieval failed:', caught);
    }
  }

  const reply = await createSpaceBunnyChatCompletion(
    [
      { role: 'system', content: `${CONTRACT_SYSTEM_PROMPT}\n\nLANGUAGE:\n${LANGUAGE_DEFINITIONS[language].instruction}` },
      {
        role: 'user',
        content: `RETRIEVED RWANDAN LAW:\n${contextText}\n\nDOCUMENT TEXT:\n${text}`,
      },
    ],
    { temperature: 0.1 },
  );

  const findings: ContractFinding[] = [];
  const riskBlock = reply.split('### Risk findings')[1]?.split('###')[0] || '';
  for (const line of riskBlock.split('\n')) {
    const match = line.match(/^\s*[-*]\s*\*\*\[?(HIGH|MEDIUM|LOW)\]?\s*([^*]+)\*\*\s*[-—:]\s*(.+)$/i);
    if (!match) continue;
    findings.push({
      severity: match[1].toLowerCase() as ContractFinding['severity'],
      title: match[2].trim(),
      detail: match[3].trim(),
      lawReference: match[3].match(/((?:N°|No\.?|Law)\s*[\d./-]+|Article\s*\d+[A-Za-z]?)/i)?.[1] ?? null,
    });
  }

  const bullets = (section: string) =>
    (reply.split(`### ${section}`)[1]?.split('###')[0] || '')
      .split('\n')
      .map((line) => line.replace(/^\s*[-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean);

  const review: ContractReview = {
    documentType: (reply.split('### Document type')[1]?.split('###')[0] || 'Contract').trim().split('\n')[0],
    summary: (reply.split('### Summary')[1]?.split('###')[0] || '').trim(),
    findings,
    positives: bullets('In your favour'),
    nextSteps: bullets('Do this next'),
  };

  await logUsageEvent({
    eventType: 'contract_analyzed',
    surface: 'business',
    language,
  });

  return { success: true, review };
}