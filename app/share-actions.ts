'use server';

import { randomBytes } from 'node:crypto';
import { getAdminSession, getCurrentSessions } from '@/lib/auth';
import {
  getSupabaseAdminClient,
  getSupabasePublicClient,
  SupabaseConfigurationError,
} from '@/lib/supabase';

export interface SharedSource {
  lawId: string;
  title: string;
  referenceNumber: string | null;
  articleNumber: string | null;
}

export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  error?: string;
}

export interface SharedConsultation {
  question: string;
  answer: string;
  sources: SharedSource[];
  created_at: string;
}

const MAX_QUESTION = 2_000;
const MAX_ANSWER = 40_000;
const MAX_SOURCES = 20;

/** URL-safe token so shared links cannot be enumerated. */
function createShareToken(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Publish one answered question as a read-only link.
 *
 * Only the exact question and answer are stored. No account detail, no chat
 * history, and no identifiers of the person who asked, so a shared link cannot
 * be traced back to a user.
 */
export async function shareConsultation(
  question: string,
  answer: string,
  sources: SharedSource[],
): Promise<ShareResult> {
  const session = await getCurrentSessions();
  if (!session.admin && !session.account) {
    return { success: false, error: 'Sign in before sharing a consultation.' };
  }

  const cleanQuestion = question.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION);
  const cleanAnswer = answer.trim().slice(0, MAX_ANSWER);

  if (cleanQuestion.length < 8) {
    return { success: false, error: 'The question is too short to share.' };
  }
  if (cleanAnswer.length < 20) {
    return { success: false, error: 'There is no answer to share yet.' };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const shareToken = createShareToken();

    const { error } = await supabase.from('shared_consultations').insert({
      share_token: shareToken,
      question: cleanQuestion,
      answer: cleanAnswer,
      sources: (sources || []).slice(0, MAX_SOURCES),
    });

    if (error) {
      if (error.message.includes('shared_consultations')) {
        return {
          success: false,
          error:
            'Sharing is not set up yet. Run supabase/migrations/010_add_review_timeline_and_shares.sql in the Supabase SQL Editor, then retry.',
        };
      }
      return { success: false, error: `Could not create the share link: ${error.message}` };
    }

    const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    return { success: true, shareUrl: `${base}/share/${shareToken}` };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return { success: false, error: error.message };
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('Share link error:', message);
    return { success: false, error: 'The share link could not be created right now.' };
  }
}

/** Read a shared consultation by its public token. */
export async function getSharedConsultation(shareToken: string): Promise<SharedConsultation | null> {
  const token = shareToken.replace(/[^a-zA-Z0-9_-]/g, '');
  if (token.length < 10) return null;

  try {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from('shared_consultations')
      .select('question, answer, sources, created_at')
      .eq('share_token', token)
      .maybeSingle();

    if (error) {
      console.error('Shared consultation lookup error:', error.message);
      return null;
    }
    if (!data) return null;

    const sources = Array.isArray(data.sources) ? (data.sources as SharedSource[]) : [];

    return {
      question: String(data.question || ''),
      answer: String(data.answer || ''),
      sources: sources.map((source) => ({
        lawId: String(source.lawId || ''),
        title: String(source.title || 'Untitled law'),
        referenceNumber: source.referenceNumber ? String(source.referenceNumber) : null,
        articleNumber: source.articleNumber ? String(source.articleNumber) : null,
      })),
      created_at: String(data.created_at || ''),
    };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return null;
    }
    console.error('Shared consultation lookup error:', error);
    return null;
  }
}

/** Library counts for the admin dashboard. */
export async function getAdminLibraryStats(): Promise<{
  total_laws: number;
  reviewed_laws: number;
  pending_laws: number;
  total_articles: number;
  stored_pdfs: number;
  amendments: number;
  categories: number;
} | null> {
  if (!(await getAdminSession())) return null;

  try {
    const { data, error } = await getSupabaseAdminClient().rpc('admin_library_stats');
    if (error) return null;

    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (!row) return null;

    return {
      total_laws: Number(row.total_laws) || 0,
      reviewed_laws: Number(row.reviewed_laws) || 0,
      pending_laws: Number(row.pending_laws) || 0,
      total_articles: Number(row.total_articles) || 0,
      stored_pdfs: Number(row.stored_pdfs) || 0,
      amendments: Number(row.amendments) || 0,
      categories: Number(row.categories) || 0,
    };
  } catch (error) {
    console.error('Admin stats query error:', error);
    return null;
  }
}
