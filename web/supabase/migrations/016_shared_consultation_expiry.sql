-- 016: Shared consultation expiry and view counting.
--
-- Adds an expires_at column (default 90 days) and populates view_count.
-- Existing rows get 90 days from now.

alter table public.shared_consultations
  add column if not exists expires_at timestamptz
    not null default (now() + interval '90 days');

update public.shared_consultations
set expires_at = coalesce(expires_at, created_at + interval '90 days')
where expires_at is null;

-- RLS: public read only for non-expired rows.
drop policy if exists "Public read shared consultations" on public.shared_consultations;
create policy "Public read shared consultations"
on public.shared_consultations for select
using (expires_at > now());