-- 010: Admin review trail for AI classifications.
--
-- updateLawClassification stamps these when an administrator corrects a
-- classification, so a reviewer can always tell machine output from a
-- human-approved record.

alter table public.laws
  add column if not exists classification_reviewed_at timestamptz,
  add column if not exists classification_reviewed_by text;

create index if not exists laws_reviewed_idx
  on public.laws (classification_reviewed_at desc);

-- Amendment timeline: every law that amends another, ordered chronologically.
-- Powers the "how has this law changed over time" view.
-- Same rule as 009: a function whose OUT row type changes cannot be replaced
-- in place, so it is dropped and rebuilt.
drop function if exists public.law_amendment_timeline(uuid);

create or replace function public.law_amendment_timeline(target_law_id uuid)
returns table (
  amendment_id uuid,
  title text,
  reference_number text,
  status text,
  amends_law_reference text,
  gazette_reference text,
  publication_date date,
  effective_date date,
  affected_articles text[],
  repealed_articles text[],
  inserted_articles text[],
  retroactive_effective_date jsonb,
  summary text,
  reviewed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    amendment.id,
    amendment.title,
    amendment.reference_number,
    amendment.status,
    amendment.amends_law_reference,
    amendment.gazette_reference,
    amendment.publication_date,
    amendment.effective_date,
    coalesce(amendment.affected_articles, '{}'::text[]),
    coalesce(amendment.repealed_articles, '{}'::text[]),
    coalesce(amendment.inserted_articles, '{}'::text[]),
    coalesce(amendment.retroactive_effective_date, '{}'::jsonb),
    amendment.summary,
    amendment.classification_reviewed_at
  from public.laws amendment
  where amendment.amends_law_reference is not null
    and (
      -- An amendment that names this law directly.
      lower(coalesce(amendment.amends_law_reference, '')) =
        lower(coalesce(
          (select coalesce(reference_number, '') from public.laws where id = target_law_id),
          ''
        ))
      -- Or an amendment this law was itself superseded by.
      or lower(coalesce(amendment.reference_number, '')) =
        lower(coalesce(
          (select coalesce(superseded_by, '') from public.laws where id = target_law_id),
          ''
        ))
    )
  order by amendment.publication_date asc nulls last, amendment.created_at asc;
$$;

grant execute on function public.law_amendment_timeline(uuid) to anon, authenticated;

-- Two laws compared side by side, each with its ordered article list.
drop function if exists public.get_laws_for_comparison(uuid, uuid);

create or replace function public.get_laws_for_comparison(
  first_law_id uuid,
  second_law_id uuid
)
returns table (
  law_id uuid,
  title text,
  reference_number text,
  status text,
  type text,
  amends_law_reference text,
  publication_date date,
  effective_date date,
  summary text,
  key_obligations text[],
  applicable_entities text[],
  penalties_non_compliance text[],
  article_count bigint
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
    law.status,
    law.type,
    law.amends_law_reference,
    law.publication_date,
    law.effective_date,
    law.summary,
    coalesce(law.key_obligations, '{}'::text[]),
    coalesce(law.applicable_entities, '{}'::text[]),
    coalesce(law.penalties_non_compliance, '{}'::text[]),
    (
      select count(*)
      from public.law_articles as article
      where article.law_id = law.id
        and article.chunk_type = 'article'
    )
  from public.laws law
  where law.id in (first_law_id, second_law_id);
$$;

grant execute on function public.get_laws_for_comparison(uuid, uuid) to anon, authenticated;

-- Shareable consultations. The id is a random token, not a sequential id, so
-- links cannot be enumerated.
create table if not exists public.shared_consultations (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique,
  question text not null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  view_count integer not null default 0
);

alter table public.shared_consultations enable row level security;

-- Reads are public because a shared consultation is meant to be shared. Writes
-- stay service-role only, so nobody can publish through the anon client.
drop policy if exists "Public read shared consultations" on public.shared_consultations;
create policy "Public read shared consultations"
on public.shared_consultations for select
using (true);

create index if not exists shared_consultations_created_at_idx
  on public.shared_consultations (created_at desc);

-- Admin counts for the dashboard: how much is stored and how much is reviewed.
drop function if exists public.admin_library_stats();
create or replace function public.admin_library_stats()
returns table (
  total_laws bigint,
  reviewed_laws bigint,
  pending_laws bigint,
  total_articles bigint,
  stored_pdfs bigint,
  amendments bigint,
  categories bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.laws),
    (select count(*) from public.laws where classification_reviewed_at is not null),
    (select count(*) from public.laws where classification_reviewed_at is null),
    (select count(*) from public.law_articles where chunk_type = 'article'),
    (select count(*) from public.laws where source_pdf_path is not null),
    (select count(*) from public.laws where type = 'amendment'),
    (select count(distinct category_id) from public.laws);
$$;

grant execute on function public.admin_library_stats() to anon, authenticated;