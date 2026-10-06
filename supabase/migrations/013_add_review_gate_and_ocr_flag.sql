-- 013: Review gate + OCR flag for the Law Library.
--
-- 010 added classification_reviewed_at/by but never exposed them to readers,
-- so citizens could not tell reviewed from unreviewed and the library could
-- not hide pending laws. This migration:
--   1. adds needs_ocr (true when the PDF had almost no extractable text),
--   2. re-exposes list_law_library() with reviewed_at, reviewed_by, needs_ocr
--      alongside the 012 integrity columns.
--
-- UI rule (no DB break): citizens see reviewed laws only; admins see all with
-- an "Awaiting review" badge and one-click Approve (updateLawClassification
-- already stamps reviewed_at/by). Run in the Supabase SQL Editor. Re-runnable.

alter table public.laws
  add column if not exists needs_ocr boolean not null default false;

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
