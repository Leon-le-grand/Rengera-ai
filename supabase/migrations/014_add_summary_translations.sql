-- 014: Cached summary translations for the Law Library reader.
--
-- Summaries are classified in one language. Citizens read in Kinyarwanda,
-- French or Kiswahili, so the reader offers EN/RW/FR/SW tabs. Translations
-- are produced on first request by getTranslatedSummary() and cached here, so
-- each law is translated at most once per language. Run in the Supabase SQL
-- Editor. Re-runnable.

alter table public.laws
  add column if not exists summary_rw text,
  add column if not exists summary_fr text,
  add column if not exists summary_sw text;

drop function if exists public.list_law_library();

create or replace function public.list_law_library()
returns table (
  id uuid,
  title text,
  reference_number text,
  gazette_reference text,
  status text,
  type text,
  amends_law_reference text,
  superseded_by text,
  affected_articles text[],
  repealed_articles text[],
  inserted_articles text[],
  retroactive_effective_date jsonb,
  publication_date date,
  effective_date date,
  language text,
  languages_available text[],
  source_url text,
  summary text,
  summary_rw text,
  summary_fr text,
  summary_sw text,
  subcategories text[],
  key_obligations jsonb,
  applicable_entities text[],
  penalties_non_compliance text[],
  tags text[],
  category text,
  article_count bigint,
  source_pdf_path text,
  source_pdf_name text,
  source_pdf_size bigint,
  content_hash text,
  source_pdf_sha256 text,
  extraction_coverage_percent integer,
  extraction_char_count integer,
  reviewed_at timestamptz,
  reviewed_by text,
  needs_ocr boolean,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    law.id,
    law.title,
    law.reference_number,
    law.gazette_reference,
    law.status,
    law.type,
    law.amends_law_reference,
    law.superseded_by,
    coalesce(law.affected_articles, '{}'::text[]),
    coalesce(law.repealed_articles, '{}'::text[]),
    coalesce(law.inserted_articles, '{}'::text[]),
    coalesce(law.retroactive_effective_date, '{}'::jsonb),
    law.publication_date,
    law.effective_date,
    law.language,
    coalesce(law.languages_available, '{kinyarwanda,english,french}'::text[]),
    law.source_url,
    law.summary,
    law.summary_rw,
    law.summary_fr,
    law.summary_sw,
    coalesce(law.subcategories, '{}'::text[]),
    coalesce(law.key_obligations, '[]'::jsonb),
    coalesce(law.applicable_entities, '{}'::text[]),
    coalesce(law.penalties_non_compliance, '{}'::text[]),
    coalesce(law.tags, '{}'::text[]),
    category.name,
    (
      select count(*)
      from public.law_articles as article
      where article.law_id = law.id
        and article.chunk_type = 'article'
    ),
    law.source_pdf_path,
    law.source_pdf_name,
    law.source_pdf_size,
    law.content_hash,
    law.source_pdf_sha256,
    law.extraction_coverage_percent,
    law.extraction_char_count,
    law.classification_reviewed_at,
    law.classification_reviewed_by,
    coalesce(law.needs_ocr, false),
    law.created_at
  from public.laws law
  left join public.legal_categories category on category.id = law.category_id;
$$;

grant execute on function public.list_law_library() to anon, authenticated;
