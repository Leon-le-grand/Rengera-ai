alter table public.laws
  add column if not exists publication_date date,
  add column if not exists effective_date date,
  add column if not exists language text,
  add column if not exists source_url text,
  add column if not exists classification_model text,
  add column if not exists classification_prompt_version text;

alter table public.laws
  drop constraint if exists laws_supported_language_check;

alter table public.laws
  add constraint laws_supported_language_check
  check (language is null or language in ('kinyarwanda', 'english', 'french'));

alter table public.laws
  drop column if exists search_vector;

alter table public.laws
  add column search_vector tsvector
  generated always as (
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(reference_number, '')), 'A') ||
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B') ||
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(raw_content, '')), 'C')
  ) stored;

create index if not exists laws_search_vector_gin_idx
  on public.laws using gin (search_vector);

create or replace function public.search_laws(
  query_text text,
  result_limit integer default 5
)
returns table (
  id uuid,
  title text,
  reference_number text,
  summary text,
  category text,
  source_url text,
  excerpt text,
  search_rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with search as (
    select pg_catalog.websearch_to_tsquery('simple'::regconfig, query_text) as query
  )
  select
    law.id,
    law.title,
    law.reference_number,
    law.summary,
    category.name as category,
    law.source_url,
    pg_catalog.ts_headline(
      'simple'::regconfig,
      law.raw_content,
      search.query,
      'StartSel=, StopSel=, MaxWords=90, MinWords=25'
    ) as excerpt,
    pg_catalog.ts_rank_cd(law.search_vector, search.query)::real as search_rank
  from public.laws as law
  left join public.legal_categories as category on category.id = law.category_id
  cross join search
  where law.search_vector @@ search.query
     or law.title ilike '%' || query_text || '%'
     or law.reference_number ilike '%' || query_text || '%'
  order by search_rank desc, law.created_at desc
  limit pg_catalog.least(pg_catalog.greatest(result_limit, 1), 10);
$$;

grant execute on function public.search_laws(text, integer) to anon, authenticated;
