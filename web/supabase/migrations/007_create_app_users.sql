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