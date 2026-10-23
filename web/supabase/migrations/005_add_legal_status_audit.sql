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
