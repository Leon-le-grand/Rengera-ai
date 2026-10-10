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
const EXCERPT_CHARS = 90;

function cleanKeyword(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_KEYWORD);
}

function trimExcerpt(value: string | null): string {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
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
    result_limit: MAX_RESULTS,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as SearchRow[]).slice(0, MAX_RESULTS);
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

  // Root menu.
  if (text === '') {
    return textResponse(
      'CON Murakaza neza kuri RENGERA AI\n1. Shakisha ijambo\n2. Amashami yamategeko\n3. Ubufasha bwihuse',
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

    void logUsageEvent({
      eventType: 'question_asked',
      surface: 'ussd',
      language: 'rw',
      query: keyword,
    }).catch(() => {});

    const rows = await searchLaws(keyword);
    if (rows.length === 0) {
      return textResponse(`END Nta tegeko ryabonetse kuri "${keyword}". Gerageza irindi jambo.`);
    }

    const lines = rows.map((row, index) => {
      const ref = row.reference_number || row.document_title.slice(0, 30);
      const article = row.article_number ? ` Ing.${row.article_number}` : '';
      return `${index + 1}. ${ref}${article}: ${trimExcerpt(row.excerpt)}`;
    });
    return textResponse(`END Ibyabonetse kuri "${keyword}":\n${lines.join('\n')}`);
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

  // 3 → instant help: rights pointers + official emergency contacts.
  if (text === '3') {
    return textResponse(
      'END Ubufasha bwihuse:\nUmukozi: saba amasezerano yanditse.\nUmupangayi: ntiwimurwe utabanje kumenyeshwa.\nIhohoterwa: Isange 3029\nPolisi: 112, RIB: 166',
    );
  }

  return textResponse('END Hitamo 1, 2 cyangwa 3. Ongera ugerageze.');
}
