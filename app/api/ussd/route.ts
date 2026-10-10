import { getSupabasePublicClient } from '@/lib/supabase';
import { logUsageEvent } from '@/app/product-actions';

export const dynamic = 'force-dynamic';

/**
 * USSD webhook for Africa's Talking (Kinyarwanda-first prototype).
 *
 * Protocol: gateway POSTs form fields sessionId, serviceCode, phoneNumber,
 * text (accumulated input like "1*umushahara"). We answer text/plain starting
 * with CON (keep session open) or END (close it).
 *
 * Rules for this endpoint:
 * - Database RPC only, never the LLM: USSD gateways drop slow sessions, so
 *   every branch must answer in well under 10 seconds.
 * - Screens are tiny (~160 chars visible): top-3 results, trimmed excerpts.
 * - Public endpoint by design (phones have no login): input is length-capped
 *   and read-only queries only. The service-role key never leaves the server.
 */

const MAX_KEYWORD = 60;
const MAX_RESULTS = 3;
const FETCH_RESULTS = 8;
const EXCERPT_CHARS = 90;

function cleanKeyword(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_KEYWORD);
}

function trimExcerpt(value: string | null): string {
  let clean = (value || '').replace(/\s+/g, ' ').trim();
  // Article rows start with gazette boilerplate ("Official Gazette n° …:").
  // Strip that header so the 90 chars carry meaning, not masthead.
  clean = clean.replace(
    /^(official gazette|journal officiel|igazeti)[^:;.!?]{0,80}[:;.!?]\s*/i,
    '',
  );
  return clean.length > EXCERPT_CHARS ? `${clean.slice(0, EXCERPT_CHARS)}…` : clean;
}

interface SearchRow {
  document_title: string;
  reference_number: string | null;
  article_number: string | null;
  excerpt: string | null;
  search_rank: number;
}

async function searchLaws(keyword: string): Promise<SearchRow[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase.rpc('search_legal_context', {
    query_text: keyword,
    result_limit: FETCH_RESULTS,
  });
  if (error || !Array.isArray(data)) return [];
  // Front-matter rows ("preamble") carry gazette headers, not answers — drop
  // them so every line on the tiny screen is a real article or full law.
  return (data as SearchRow[])
    .filter((row) => row.article_number !== 'preamble')
    .slice(0, MAX_RESULTS);
}

async function listCategories(): Promise<string[]> {
  try {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from('legal_categories')
      .select('name')
      .order('name', { ascending: true })
      .limit(5);
    if (error || !Array.isArray(data)) return [];
    return (data as { name: string }[]).map((row) => row.name).filter(Boolean);
  } catch {
    return [];
  }
}

async function recentLawsInCategory(category: string): Promise<{ title: string; reference: string | null }[]> {
  try {
    const supabase = getSupabasePublicClient();
    const { data, error } = await supabase
      .from('laws')
      .select('title, reference_number, legal_categories!inner(name)')
      .eq('legal_categories.name', category)
      .order('created_at', { ascending: false })
      .limit(MAX_RESULTS);
    if (error || !Array.isArray(data)) return [];
    return (data as { title: string; reference_number: string | null }[]).map((row) => ({
      title: row.title,
      reference: row.reference_number,
    }));
  } catch {
    return [];
  }
}

function textResponse(body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function GET() {
  return textResponse('END RENGERA AI USSD endpoint is live. Dial the service code from a phone to use it.');
}

export async function POST(req: Request) {
  let text = '';
  let phoneNumber = '';
  try {
    const form = await req.formData();
    text = String(form.get('text') || '');
    phoneNumber = String(form.get('phoneNumber') || '');
  } catch {
    return textResponse('END Ikosa rya serivisi. Ongera ugerageze nyuma.');
  }

  const parts = text.split('*');
  const choice = parts[0] || '';

  // Trace every gateway hit (fire-and-forget): proves in the admin analytics
  // whether Africa's Talking ever called us, and which input it sent.
  void logUsageEvent({
    eventType: 'question_asked',
    surface: 'ussd-hit',
    language: 'rw',
    query: text === '' ? '(root dial)' : text.slice(0, 60),
  }).catch(() => {});

  // Root menu.
  if (text === '') {
    return textResponse(
      'CON Murakaza neza kuri RENGERA AI\n1. Shakisha ijambo\n2. Amashami y amategeko\n3. Ubutabazi bwihuse',
    );
  }

  // 1 → ask for keyword.
  if (text === '1') {
    return textResponse('CON Andika ijambo ushakisha (urugero: umushahara):');
  }

  // 1*<keyword> → search the law library (RPC, no LLM).
  if (choice === '1' && parts.length >= 2) {
    const keyword = cleanKeyword(parts.slice(1).join(' '));
    if (keyword.length < 2) {
      return textResponse('END Andika ijambo rirenze inyuguti imwe.');
    }

    const rows = await searchLaws(keyword);
    if (rows.length === 0) {
      return textResponse(`END Nta tegeko ryabonetse kuri "${keyword}". Gerageza irindi jambo.`);
    }

    const lines = rows.map((row, index) => {
      const ref = (row.reference_number || row.document_title).slice(0, 34);
      const article = row.article_number ? `, Art ${row.article_number}` : '';
      return `${index + 1}. ${ref}${article}:\n${trimExcerpt(row.excerpt)}`;
    });
    return textResponse(`END "${keyword}" — ${rows.length} zabonetse:\n${lines.join('\n')}`);
  }

  // 2 → category menu.
  if (text === '2') {
    const categories = await listCategories();
    if (categories.length === 0) {
      return textResponse('END Nta mashami abonetse ubu. Ongera ugerageze nyuma.');
    }
    const lines = categories.map((name, index) => `${index + 1}. ${name.slice(0, 28)}`);
    return textResponse(`CON Hitamo ishami:\n${lines.join('\n')}`);
  }

  // 2*<n> → newest laws in that category.
  if (choice === '2' && parts.length === 2) {
    const categories = await listCategories();
    const selected = categories[Number(parts[1]) - 1];
    if (!selected) {
      return textResponse('END Hitamo umubare uri kuri lisiti. Ongera ugerageze.');
    }
    const laws = await recentLawsInCategory(selected);
    if (laws.length === 0) {
      return textResponse(`END Nta mategeko abonetse muri "${selected}".`);
    }
    const lines = laws.map(
      (law, index) => `${index + 1}. ${(law.reference || law.title).slice(0, 60)}`,
    );
    return textResponse(`END ${selected.slice(0, 30)}:\n${lines.join('\n')}`);
  }

  // 3 → instant help: official emergency contacts first, then 2 rights lines.
  if (text === '3') {
    return textResponse(
      'END Ubutabazi:\nPolisi 112\nRIB 166\nIsange (ihohoterwa) 3029\n---\nUmukozi: saba amasezerano yanditse.\nUmupangayi: ntiwimurwe utabanje kumenyeshwa.',
    );
  }

  return textResponse('END Hitamo 1, 2 cyangwa 3. Ongera ugerageze.');
}
