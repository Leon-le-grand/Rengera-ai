create table if not exists public.law_articles (
  id uuid primary key default gen_random_uuid(),
  law_id uuid not null references public.laws(id) on delete cascade,
  document_title text not null,
  reference_number text,
  article_number text not null,
  article_title text,
  language text not null check (language in ('kinyarwanda', 'english', 'french')),
  content text not null,
  content_hash text not null,
  citation text not null,
  source_url text,
  created_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(article_number, '')), 'A') ||
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(article_title, '')), 'A') ||
    setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(content, '')), 'B')
  ) stored,
  unique (law_id, content_hash)
);

create index if not exists law_articles_law_id_idx on public.law_articles (law_id);
create index if not exists law_articles_number_idx on public.law_articles (law_id, article_number);
create index if not exists law_articles_search_vector_gin_idx
  on public.law_articles using gin (search_vector);

alter table public.law_articles enable row level security;

drop policy if exists "Public Read Access for Law Articles" on public.law_articles;
create policy "Public Read Access for Law Articles"
on public.law_articles for select
using (true);

create or replace function public.rlrc_or_tsquery(query_text text)
returns tsquery
language sql
stable
set search_path = ''
as $$
  select pg_catalog.to_tsquery(
    'simple'::regconfig,
    coalesce(
      (
        select pg_catalog.string_agg(tokens.lexeme, ' | ')
        from pg_catalog.unnest(
          pg_catalog.tsvector_to_array(
            pg_catalog.to_tsvector('simple'::regconfig, query_text)
          )
        ) as tokens(lexeme)
        where length(tokens.lexeme) > 2
      ),
      ''
    )
  );
$$;

create or replace function public.search_legal_context(
  query_text text,
  result_limit integer default 8
)
returns table (
  law_id uuid,
  source_kind text,
  document_title text,
  reference_number text,
  article_number text,
  article_title text,
  language text,
  source_url text,
  citation text,
  excerpt text,
  search_rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with search as (
    select public.rlrc_or_tsquery(query_text) as query
  ),
  article_results as (
    select
      article.law_id,
      'article'::text as source_kind,
      article.document_title,
      article.reference_number,
      article.article_number,
      article.article_title,
      article.language,
      coalesce(article.source_url, 'https://www.rlrc.gov.rw/') as source_url,
      article.citation,
      pg_catalog.ts_headline(
        'simple'::regconfig,
        article.content,
        search.query,
        'StartSel=, StopSel=, MaxWords=120, MinWords=30'
      ) as excerpt,
      pg_catalog.ts_rank_cd(article.search_vector, search.query)::real as search_rank
    from public.law_articles as article
    cross join search
    where article.search_vector @@ search.query
    order by search_rank desc, article.created_at desc
    limit least(greatest(result_limit, 1), 10)
  ),
  law_results as (
    select
      law.id as law_id,
      'law'::text as source_kind,
      law.title as document_title,
      law.reference_number,
      null::text as article_number,
      null::text as article_title,
      law.language,
      coalesce(law.source_url, 'https://www.rlrc.gov.rw/') as source_url,
      law.title || coalesce(' (' || law.reference_number || ')', '') ||
        '. Source: ' || coalesce(law.source_url, 'https://www.rlrc.gov.rw/') as citation,
      pg_catalog.ts_headline(
        'simple'::regconfig,
        law.raw_content,
        search.query,
        'StartSel=, StopSel=, MaxWords=120, MinWords=30'
      ) as excerpt,
      pg_catalog.ts_rank_cd(law.search_vector, search.query)::real as search_rank
    from public.laws as law
    cross join search
    where law.search_vector @@ search.query
      and not exists (
        select 1 from public.law_articles as article where article.law_id = law.id
      )
    order by search_rank desc, law.created_at desc
    limit least(greatest(result_limit, 1), 10)
  )
  select * from article_results
  union all
  select * from law_results
  order by search_rank desc
  limit least(greatest(result_limit, 1), 10);
$$;

grant execute on function public.rlrc_or_tsquery(text) to anon, authenticated;
grant execute on function public.search_legal_context(text, integer) to anon, authenticated;
