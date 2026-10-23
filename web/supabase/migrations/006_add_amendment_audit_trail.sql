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