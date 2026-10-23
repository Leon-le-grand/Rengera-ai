-- ============================================================
-- RENGERA AI - FULL SCHEMA (safe to re-run)
-- Generated from supabase/migrations/001..007
-- Every statement is idempotent: add column if not exists,
-- drop/create policy, drop column then re-add, create or replace.
-- Safe to paste into the Supabase SQL Editor more than once.
-- ============================================================


-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/001_create_legal_knowledge_base.sql
-- ---------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.legal_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.laws (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  reference_number text,
  category_id uuid references public.legal_categories(id) on delete set null,
  subcategories text[] not null default '{}',
  summary text,
  key_obligations jsonb not null default '[]'::jsonb,
  applicable_entities text[] not null default '{}',
  penalties_non_compliance text[] not null default '{}',
  tags text[] not null default '{}',
  raw_content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laws_key_obligations_array check (jsonb_typeof(key_obligations) = 'array')
);

create index if not exists laws_category_id_idx on public.laws (category_id);
create index if not exists laws_reference_number_idx on public.laws (reference_number);
create index if not exists laws_created_at_idx on public.laws (created_at desc);
create index if not exists laws_tags_gin_idx on public.laws using gin (tags);
create index if not exists laws_subcategories_gin_idx on public.laws using gin (subcategories);
create index if not exists legal_categories_name_idx on public.legal_categories (name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists laws_set_updated_at on public.laws;
create trigger laws_set_updated_at
before update on public.laws
for each row execute function public.set_updated_at();

alter table public.legal_categories enable row level security;
alter table public.laws enable row level security;

drop policy if exists "Public Read Access for Laws" on public.laws;
create policy "Public Read Access for Laws"
on public.laws for select
using (true);

drop policy if exists "Public Read Access for Legal Categories" on public.legal_categories;
create policy "Public Read Access for Legal Categories"
on public.legal_categories for select
using (true);

-- Writes are intentionally not granted to anon or authenticated roles.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY only after the custom
-- administrator session has been verified in app/auth-actions.ts.


-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/002_add_classification_metadata_and_search.sql
-- ---------------------------------------------------------------
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
  limit least(greatest(result_limit, 1), 10);
$$;

grant execute on function public.search_laws(text, integer) to anon, authenticated;


-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/003_improve_search_and_deduplicate.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/004_add_article_level_search.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/005_add_legal_status_audit.sql
-- ---------------------------------------------------------------
alter table public.laws
  add column if not exists gazette_reference text,
  add column if not exists status text not null default 'active',
  add column if not exists superseded_by text,
  add column if not exists affected_articles text[] not null default '{}';

alter table public.laws
  drop constraint if exists laws_legal_status_check;

alter table public.laws
  add constraint laws_legal_status_check
  check (status in ('active', 'amended', 'repealed'));

create index if not exists laws_status_idx on public.laws (status);
create index if not exists laws_affected_articles_gin_idx
  on public.laws using gin (affected_articles);


-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/006_add_amendment_audit_trail.sql
-- ---------------------------------------------------------------
-- 006: Amendment audit trail + trilingual availability
-- Adds the fields required by the Rwandan Legal Extraction and Audit Engine.

alter table public.laws
  add column if not exists type text not null default 'principal',
  add column if not exists amends_law_reference text,
  add column if not exists repealed_articles text[] not null default '{}',
  add column if not exists inserted_articles text[] not null default '{}',
  add column if not exists retroactive_effective_date jsonb not null default '{}'::jsonb,
  add column if not exists languages_available text[] not null default '{kinyarwanda,english,french}';

alter table public.laws
  drop constraint if exists laws_type_check;

alter table public.laws
  add constraint laws_type_check
  check (type in ('principal', 'amendment'));

alter table public.laws
  drop constraint if exists laws_languages_available_check;

alter table public.laws
  add constraint laws_languages_available_check
  check (
    languages_available <@ array['kinyarwanda', 'english', 'french']::text[]
    and cardinality(languages_available) > 0
  );

create index if not exists laws_type_idx on public.laws (type);
create index if not exists laws_amends_law_reference_idx
  on public.laws (amends_law_reference);
create index if not exists laws_languages_available_gin_idx
  on public.laws using gin (languages_available);
create index if not exists laws_repealed_articles_gin_idx
  on public.laws using gin (repealed_articles);
create index if not exists laws_inserted_articles_gin_idx
  on public.laws using gin (inserted_articles);
create index if not exists laws_retroactive_effective_date_gin_idx
  on public.laws using gin (retroactive_effective_date);

-- Backfill: every existing amendment that names its target keeps it, the rest
-- stay principal. Languages default to the three official ones.
update public.laws
set amends_law_reference = null
where amends_law_reference = '';

update public.laws
set retroactive_effective_date = '{}'::jsonb
where retroactive_effective_date is null;

update public.laws
set languages_available = '{kinyarwanda,english,french}'::text[]
where languages_available is null
   or cardinality(languages_available) = 0;

-- Amendment chains are the highest-value audit view.
create or replace function public.laws_amendment_chain()
returns table (
  law_id uuid,
  law_title text,
  law_reference text,
  law_type text,
  amends_law_reference text,
  parent_title text,
  parent_reference text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    child.id,
    child.title,
    child.reference_number,
    child.type,
    child.amends_law_reference,
    parent.title,
    parent.reference_number
  from public.laws child
  left join public.laws parent
    on child.amends_law_reference is not null
   and (
     lower(coalesce(parent.reference_number, '')) = lower(child.amends_law_reference)
     or lower(parent.title) = lower(child.amends_law_reference)
   )
  where child.type = 'amendment';
$$;

grant execute on function public.laws_amendment_chain() to anon, authenticated;

-- ---------------------------------------------------------------
-- SOURCE: supabase/migrations/007_create_app_users.sql
-- ---------------------------------------------------------------
-- 007: Citizen accounts for sign-up and sign-in.
--
-- SECURITY MODEL
-- The table has RLS enabled and NO policies, so anon/authenticated clients can
-- never read or write it. Only the service-role key used by the Next.js server
-- actions touches it. Passwords are stored as scrypt hashes produced by
-- lib/auth.ts; the plaintext password never leaves the request.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  password_hash text not null,
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.app_users
  drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check check (role in ('user', 'staff', 'admin'));

alter table public.app_users
  drop constraint if exists app_users_status_check;
alter table public.app_users
  add constraint app_users_status_check check (status in ('active', 'suspended'));

alter table public.app_users enable row level security;

-- Case-insensitive uniqueness: the sign-up path lowercases before insert.
create unique index if not exists app_users_email_lower_key
  on public.app_users (lower(email));

create index if not exists app_users_created_at_idx
  on public.app_users (created_at desc);

comment on table public.app_users is
  'Citizen accounts for RENGERA AI. Service-role only; RLS is enabled with no policies.';

-- Password reset and email change still require a service-role read, so this
-- helper is deliberately not granted to anon/authenticated.
create or replace function public.app_users_email_exists(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users where lower(email) = lower(target_email)
  );
$$;

revoke execute on function public.app_users_email_exists(text) from public, anon, authenticated;