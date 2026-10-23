alter table public.laws
  add column if not exists content_hash text;

update public.laws
set content_hash = encode(pg_catalog.sha256(pg_catalog.convert_to(raw_content, 'UTF8')), 'hex')
where content_hash is null;

-- Keep the earliest record when the same source text was uploaded more than once.
delete from public.laws as duplicate
using public.laws as keeper
where duplicate.content_hash = keeper.content_hash
  and (duplicate.created_at, duplicate.id) > (keeper.created_at, keeper.id);

alter table public.laws
  drop constraint if exists laws_content_hash_unique;

alter table public.laws
  add constraint laws_content_hash_unique unique (content_hash);

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
    ) as query
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
  limit least(greatest(result_limit, 1), 10);
$$;

grant execute on function public.search_laws(text, integer) to anon, authenticated;
