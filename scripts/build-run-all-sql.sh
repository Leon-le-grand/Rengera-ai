#!/usr/bin/env bash
# Regenerate supabase/RUN_ALL.sql from the ordered migration files.
#
#   bash scripts/build-run-all-sql.sh
#
# RUN_ALL.sql is what you paste into the Supabase SQL Editor. Regenerate it
# whenever a migration is added, so the single-file copy never drifts from the
# individual migrations.

set -euo pipefail

cd "$(dirname "$0")/.."

OUT="supabase/RUN_ALL.sql"

{
  echo "-- ============================================================"
  echo "-- RENGERA AI - FULL SCHEMA (safe to re-run)"
  echo "-- Generated from supabase/migrations/001..007 by scripts/build-run-all-sql.sh"
  echo "-- Every statement is idempotent: add column if not exists,"
  echo "-- drop/create policy, drop column then re-add, create or replace."
  echo "-- Safe to paste into the Supabase SQL Editor more than once."
  echo "-- ============================================================"

  for file in supabase/migrations/0*.sql; do
    echo ""
    echo ""
    echo "-- ---------------------------------------------------------------"
    echo "-- SOURCE: $file"
    echo "-- ---------------------------------------------------------------"
    cat "$file"
  done
} > "$OUT"

echo "Wrote $OUT ($(wc -l < "$OUT") lines, $(grep -c 'SOURCE:' "$OUT") migrations)"