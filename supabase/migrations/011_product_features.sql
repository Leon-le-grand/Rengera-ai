-- 011: Product layer — feedback, deadlines, usage analytics, law-change alerts.
--
-- Everything here is written by server actions through the service-role client,
-- so RLS stays on with no anon/authenticated policies: nothing in these tables is
-- reachable with the public key. The service role bypasses RLS by design.

-- ---------------------------------------------------------------------------
-- Answer quality loop
-- ---------------------------------------------------------------------------
create table if not exists public.answer_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  question text,
  rating smallint not null check (rating in (-1, 1)),
  reason text,
  comment text,
  cited_laws text[] not null default '{}'::text[],
  user_id text,
  created_at timestamptz not null default now()
);

create index if not exists answer_feedback_created_idx
  on public.answer_feedback (created_at desc);

create index if not exists answer_feedback_rating_idx
  on public.answer_feedback (rating, created_at desc);

-- ---------------------------------------------------------------------------
-- Deadlines: the reason a user comes back tomorrow
-- ---------------------------------------------------------------------------
create table if not exists public.user_deadlines (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  note text,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'done')),
  source_law_id text,
  source_law_title text,
  source_article text,
  user_id text,
  created_at timestamptz not null default now()
);

create index if not exists user_deadlines_due_idx
  on public.user_deadlines (due_date asc, created_at desc);

-- ---------------------------------------------------------------------------
-- Usage analytics: what investors actually ask about
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  category text,
  surface text,
  language text,
  query text,
  law_references text[] not null default '{}'::text[],
  user_id text,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_created_idx
  on public.usage_events (created_at desc);

create index if not exists usage_events_type_idx
  on public.usage_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Law-change alerts
-- ---------------------------------------------------------------------------
create table if not exists public.law_change_alerts (
  id uuid primary key default gen_random_uuid(),
  law_id text not null,
  law_title text not null,
  law_reference text,
  alert_type text not null default 'amended',
  summary text,
  source_law_id text,
  published_at date,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists law_change_alerts_created_idx
  on public.law_change_alerts (created_at desc);

-- RLS on for all four. Service role (server actions) bypasses it; the browser
-- key cannot read or write any of these tables directly.
alter table public.answer_feedback enable row level security;
alter table public.user_deadlines enable row level security;
alter table public.usage_events enable row level security;
alter table public.law_change_alerts enable row level security;

-- ---------------------------------------------------------------------------
-- Analytics rollup used by the admin dashboard
-- ---------------------------------------------------------------------------
drop function if exists public.usage_analytics(integer);

create or replace function public.usage_analytics(days_back integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with window as (
    select created_at, event_type, category, language, query
    from public.usage_events
    where created_at >= now() - make_interval(days => greatest(days_back, 1))
  )
  select jsonb_build_object(
    'total_events', (select count(*) from window),
    'questions', (select count(*) from window where event_type = 'question_asked'),
    'answers', (select count(*) from window where event_type = 'answer_given'),
    'active_sessions', (select count(distinct session_id) from window),
    'unique_days', (select count(distinct date_trunc('day', created_at)) from window),
    'avg_questions_per_day', round(
      (
        select count(*) from window where event_type = 'question_asked'
      )::numeric / nullif((select count(distinct date_trunc('day', created_at)) from window), 0),
      1
    ),
    'top_categories', (
      select coalesce(jsonb_agg(item), '[]'::jsonb)
      from (
        select jsonb_build_object('category', category, 'count', count(*)) as item
        from window
        where category is not null
        group by category
        order by count(*) desc
        limit 8
      ) rows
    ),
    'daily', (
      select coalesce(jsonb_agg(item order by day), '[]'::jsonb)
      from (
        select
          date_trunc('day', created_at)::date as day,
          jsonb_build_object(
            'day', date_trunc('day', created_at)::date,
            'questions', count(*) filter (where event_type = 'question_asked'),
            'answers', count(*) filter (where event_type = 'answer_given')
          ) as item
        from window
        group by 1
        order by 1
      ) rows
    ),
    'languages', (
      select coalesce(jsonb_agg(item), '[]'::jsonb)
      from (
        select jsonb_build_object('language', language, 'count', count(*)) as item
        from window
        where language is not null
        group by language
        order by count(*) desc
      ) rows
    )
  );
$$;

grant execute on function public.usage_analytics(integer) to anon, authenticated;