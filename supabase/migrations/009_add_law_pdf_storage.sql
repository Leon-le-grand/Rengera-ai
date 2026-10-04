-- 009: Original PDF storage for the Law Library reader.
--
-- The law reader shows the actual uploaded PDF next to a summary panel, so the
-- original binary has to be stored, not just the text extracted from it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-pdfs',
  'legal-pdfs',
  true,
  26214400,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Readers are anonymous, so the object needs a public SELECT policy to render
-- inside the reader frame. Uploads are never granted to anon or authenticated;
-- only the service-role key used by the server action can write.
drop policy if exists "Public read legal pdfs" on storage.objects;
create policy "Public read legal pdfs"
on storage.objects for select
using (bucket_id = 'legal-pdfs');

alter table public.laws
  add column if not exists source_pdf_path text,
  add column if not exists source_pdf_name text,
  add column if not exists source_pdf_size bigint;

create index if not exists laws_source_pdf_idx
  on public.laws (source_pdf_path);

-- The library listing carries the PDF reference so a card can show whether the
-- original document is available.
-- `create or replace` cannot widen or change the shape of an existing
-- function's OUT row type. Migration 008 may already have created this
-- function, so it is dropped first. The function body is recreated below and
-- the grants are re-applied, so nothing is lost.
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
  key_obligations text[],
  applicable_entities text[],
  penalties_non_compliance text[],
  tags text[],
  category text,
  article_count bigint,
  source_pdf_path text,
  source_pdf_name text,
  source_pdf_size bigint,
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
    coalesce(law.key_obligations, '{}'::text[]),
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
    law.created_at
  from public.laws law
  left join public.legal_categories category on category.id = law.category_id;
$$;

grant execute on function public.list_law_library() to anon, authenticated;