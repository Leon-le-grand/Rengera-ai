-- 017: V2 identity and RBAC foundation.
--
-- Adds the link from a legacy app_users row to a Supabase Auth user, the fixed
-- role-grant catalog, opaque server sessions (hashes only) and an admin audit
-- log. This migration is additive: it does not touch passwords or backfill
-- identities automatically. An operator links auth_user_id after verifying the
-- matching Supabase Auth user; email is never used as an implicit login link.
--
-- SECURITY MODEL
-- These tables are server-owned. RLS is enabled with no anon/authenticated
-- policies, and table privileges are revoked from those roles. Only the API's
-- service-role PostgreSQL connection may read or write them. The API remains the
-- authorization authority; role_permissions is a documented mirror of the fixed
-- grants in server/app/authorization/permissions.py and must stay in sync.

alter table public.app_users
  add column if not exists auth_user_id uuid;

-- Unique when present. Existing rows stay unlinked (null) until reviewed.
create unique index if not exists app_users_auth_user_id_key
  on public.app_users (auth_user_id)
  where auth_user_id is not null;

comment on column public.app_users.auth_user_id is
  'Supabase Auth user UUID. Linked only by an operator after identity review; never derived from email.';

-- Fixed role grants. The server code catalog is authoritative.
create table if not exists public.role_permissions (
  role text not null
    check (role in ('user', 'staff', 'admin')),
  permission text not null
    check (
      permission in (
        'law.read',
        'law.draft',
        'law.publish',
        'staff.manage',
        'workflow.manage',
        'analytics.read'
      )
    ),
  primary key (role, permission)
);

alter table public.role_permissions enable row level security;
revoke all on table public.role_permissions from anon, authenticated;

insert into public.role_permissions (role, permission)
values
  ('user', 'law.read'),
  ('staff', 'law.read'),
  ('staff', 'law.draft'),
  ('admin', 'law.read'),
  ('admin', 'law.draft'),
  ('admin', 'law.publish'),
  ('admin', 'staff.manage'),
  ('admin', 'workflow.manage'),
  ('admin', 'analytics.read')
on conflict (role, permission) do nothing;

comment on table public.role_permissions is
  'Fixed role-to-permission catalog. Server-role only; RLS enabled with no anon/authenticated policies.';

-- Opaque browser sessions. Raw session and CSRF values are never stored.
create table if not exists public.server_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  csrf_token_hash text not null
    check (csrf_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz
);

create index if not exists server_sessions_account_id_idx
  on public.server_sessions (account_id);

create index if not exists server_sessions_expires_at_idx
  on public.server_sessions (expires_at);

create index if not exists server_sessions_active_account_idx
  on public.server_sessions (account_id)
  where revoked_at is null;

alter table public.server_sessions enable row level security;
revoke all on table public.server_sessions from anon, authenticated;

comment on table public.server_sessions is
  'Server-owned opaque browser sessions. Stores SHA-256 hashes only; service-role access only, RLS has no anon/authenticated policies.';
comment on column public.server_sessions.token_hash is
  'SHA-256 of the opaque session cookie value; the raw value is never stored.';
comment on column public.server_sessions.csrf_token_hash is
  'SHA-256 of the per-session CSRF token; compared in constant time by the API.';

-- Privileged and denied authorization attempts. No token, password or body data.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_account_id uuid references public.app_users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  outcome text not null
    check (outcome in ('allowed', 'denied', 'failed')),
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_created_idx
  on public.admin_audit_log (actor_account_id, created_at desc);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from anon, authenticated;

comment on table public.admin_audit_log is
  'Audit trail for privileged and denied authorization actions. Service-role only; RLS enabled with no anon/authenticated policies.';
comment on column public.admin_audit_log.metadata is
  'Non-secret contextual fields only; never store tokens, passwords, cookies or request bodies.';
