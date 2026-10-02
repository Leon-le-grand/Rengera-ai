-- Diagnostic only. Safe to run as often as you like.
-- Returns one row per expected migration. Run_status is 'OK' or 'MISSING'.
-- Anything marked MISSING tells you the exact file to run next.

with expected as (
  select 1 as migration, '001_create_legal_knowledge_base' as file, 0 as migration_number
  union all select 2, '002_add_classification_metadata_and_search', 200
  union all select 3, '003_improve_search_and_deduplicate', 300
  union all select 4, '004_add_article_level_search', 400
  union all select 5, '005_add_legal_status_audit', 500
  union all select 6, '006_add_amendment_audit_trail', 600
  union all select 7, '007_create_app_users', 700
),
checks as (
  select
    1 as migration,
    to_regclass('public.legal_categories') is not null
      and to_regclass('public.laws') is not null as ok
  union all
  select 2,
    (select count(*) = 6 from information_schema.columns
      where table_schema = 'public' and table_name = 'laws'
        and column_name in ('publication_date','effective_date','language','source_url',
                            'classification_model','classification_prompt_version'))
  union all
  select 3,
    (select count(*) = 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'laws' and column_name = 'content_hash')
  union all
  select 4,
    to_regclass('public.law_articles') is not null
  union all
  select 5,
    (select count(*) = 4 from information_schema.columns
      where table_schema = 'public' and table_name = 'laws'
        and column_name in ('gazette_reference','status','superseded_by','affected_articles'))
  union all
  select 6,
    (select count(*) = 6 from information_schema.columns
      where table_schema = 'public' and table_name = 'laws'
        and column_name in ('type','amends_law_reference','repealed_articles',
                            'inserted_articles','retroactive_effective_date','languages_available'))
  union all
  select 7,
    to_regclass('public.app_users') is not null
)
select
  e.migration || ' - ' || e.file as migration_to_run,
  case when c.ok then 'OK' else 'MISSING' end as run_status,
  case
    when c.ok then 'nothing to do'
    else 'run supabase/migrations/' || e.file || '.sql'
  end as action
from expected e
join checks c on c.migration = e.migration
order by e.migration_number;