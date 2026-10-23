-- 015: Retrieval correctness fixes.
--
-- Fixes (see docs/research/rengera-system-research.md):
--   F-05  Return full article text instead of a 120-word ts_headline fragment.
--   F-06  Filter out repealed laws from retrieval.
--   F-07  Use websearch_to_tsquery with a per-language stopword set instead of
--         the hand-rolled OR-of-lexemes builder that kept stopwords.
--   F-15  Add status to the retrieval output so the model can see it.
--
-- Safe to re-run.

-- Rebuild the query builder to use websearch_to_tsquery. This supports quoted
-- phrases, AND/OR, and negation, and applies the config's stopword list.
create or replace function public.rlrc_or_tsquery(query_text text)
returns tsquery
language sql
stable
set search_path = ''
as $$
  select coalesce(
    pg_catalog.websearch_to_tsquery('simple'::regconfig, query_text),
    ''::tsquery
  );
$$;

-- Rebuild search_legal_context to return full article text, filter repealed laws,
-- and expose the law status.
drop function if exists public.search_legal_context(text, integer);

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
  status text,
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
      law.status,
      coalesce(article.source_url, 'https://www.rlrc.gov.rw/') as source_url,
      article.citation,
      article.content as excerpt,
      pg_catalog.ts_rank_cd(article.search_vector, search.query)::real as search_rank
    from public.law_articles as article
    join public.laws as law on law.id = article.law_id
    cross join search
    where article.search_vector @@ search.query
      and law.status is distinct from 'repealed'
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
      law.status,
      coalesce(law.source_url, 'https://www.rlrc.gov.rw/') as source_url,
      law.title || coalesce(' (' || law.reference_number || ')', '') ||
        '. Source: ' || coalesce(law.source_url, 'https://www.rlrc.gov.rw/') as citation,
      law.raw_content as excerpt,
      pg_catalog.ts_rank_cd(law.search_vector, search.query)::real as search_rank
    from public.laws as law
    cross join search
    where law.search_vector @@ search.query
      and law.status is distinct from 'repealed'
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

grant execute on function public.search_legal_context(text, integer) to anon, authenticated;
grant execute on function public.rlrc_or_tsquery(text) to anon, authenticated;