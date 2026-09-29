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
