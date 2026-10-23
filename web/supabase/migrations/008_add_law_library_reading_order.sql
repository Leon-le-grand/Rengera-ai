-- 008: Article ordering, preamble flag, and library listing helpers.
--
-- `key_obligations` is jsonb (see migration 001), not text[], so it must be
-- coalesced with '[]'::jsonb. Coercing it to text[] fails at function creation.
--
-- The law reader and the AI answer deep-links need to render a law in
-- statutory order and skip the front matter when listing articles.
--
-- The column is named `sort_order`, not `position`. `position` is reserved in
-- PostgreSQL because of the POSITION(x IN y) function, and it fails with
-- "syntax error at or near position" when used as an output column name.

-- The library function below reads columns introduced by 005 and 006. Add any
-- that are still missing so this migration cannot fail because it ran out of
-- order. Re-running is harmless.
alter table public.laws
  add column if not exists gazette_reference text,
  add column if not exists status text not null default 'active',
  add column if not exists superseded_by text,
  add column if not exists affected_articles text[] not null default '{}',
  add column if not exists type text not null default 'principal',
  add column if not exists amends_law_reference text,
  add column if not exists repealed_articles text[] not null default '{}',
  add column if not exists inserted_articles text[] not null default '{}',
  add column if not exists retroactive_effective_date jsonb not null default '{}'::jsonb,
  add column if not exists languages_available text[] not null default '{kinyarwanda,english,french}';

alter table public.laws
  drop constraint if exists laws_legal_status_check;

alter table public.laws
  add constraint laws_legal_status_check
  check (status in ('active', 'amended', 'repealed'));

alter table public.laws
  drop constraint if exists laws_type_check;

alter table public.laws
  add constraint laws_type_check
  check (type in ('principal', 'amendment'));

alter table public.law_articles
  add column if not exists chunk_type text not null default 'article',
  add column if not exists sort_order integer not null default 0;

alter table public.law_articles
  drop constraint if exists law_articles_chunk_type_check;

alter table public.law_articles
  add constraint law_articles_chunk_type_check
  check (chunk_type in ('article', 'preamble'));

-- Backfill any rows written before migration 008.
update public.law_articles
set chunk_type = case when article_number = 'preamble' then 'preamble' else 'article' end
where chunk_type is null;

create index if not exists law_articles_law_sort_order_idx
  on public.law_articles (law_id, sort_order);

-- The return type changed between 008 and 009, so the old function must be
-- dropped before the new one is created.
drop function if exists public.list_law_library();

-- Full library listing: every stored law with its category and article count.
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
    law.created_at
  from public.laws law
  left join public.legal_categories category on category.id = law.category_id;
$$;

grant execute on function public.list_law_library() to anon, authenticated;

-- Ordered article text for the reader view.
create or replace function public.get_law_articles(target_law_id uuid)
returns table (
  id uuid,
  law_id uuid,
  document_title text,
  reference_number text,
  article_number text,
  article_title text,
  chunk_type text,
  sort_order integer,
  language text,
  content text,
  citation text,
  source_url text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    article.id,
    article.law_id,
    article.document_title,
    article.reference_number,
    article.article_number,
    article.article_title,
    article.chunk_type,
    article.sort_order,
    article.language,
    article.content,
    article.citation,
    article.source_url
  from public.law_articles as article
  where article.law_id = target_law_id
  order by
    case when article.chunk_type = 'preamble' then 0 else 1 end,
    article.sort_order asc,
    article.id asc;
$$;

grant execute on function public.get_law_articles(uuid) to anon, authenticated;