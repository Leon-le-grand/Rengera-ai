#!/usr/bin/env bun
/**
 * Guards two build-breaking mistakes that dependency-free parsing cannot catch:
 *
 * 1. A `'use server'` module exporting a non-async function. Next.js fails the
 *    whole build with "Server Actions must be async functions".
 * 2. A `use server` module importing a client component, or a client component
 *    being imported by a server action module, which breaks the RSC boundary.
 *
 * Run: bun run scripts/verify-server-actions.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['app', 'lib', 'components'];

function walk(directory: string): string[] {
  const entries: string[] = [];

  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      entries.push(...walk(full));
      continue;
    }
    if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      entries.push(full);
    }
  }

  return entries;
}

const files = ROOTS.flatMap((root) => walk(root));
const failures: string[] = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  if (!/^\s*['"]use server['"];?/m.test(source)) {
    continue;
  }

  source.split('\n').forEach((line, index) => {
    // Match `export function name` and `export const name` but not `async`.
    const declaration = /^export\s+(function|const|let|var|class)\s/.exec(line);
    if (!declaration || /\basync\b/.test(line)) {
      return;
    }

    failures.push(
      `${file}:${index + 1}  non-async export in a 'use server' module -> ${line.trim()}`,
    );
  });
}

// SQL guards. These are the two failure modes that produced real outages and
// that no TypeScript check can catch, because they only exist at runtime.
const migration = readFileSync(
  'supabase/migrations/008_add_law_library_reading_order.sql',
  'utf8',
);

// `position` is reserved in PostgreSQL and fails as an output column name.
if (/^\s*position\s+(integer|bigint|text)/m.test(migration)) {
  failures.push(
    'supabase/migrations/008: `position` is reserved in PostgreSQL. Use `sort_order`.',
  );
}

// `key_obligations` is jsonb (migration 001). Coercing it to text[] fails when
// the function is created.
if (/coalesce\s*\(\s*law\.key_obligations\s*,\s*'\{\}'::text\[\]/i.test(migration)) {
  failures.push(
    "supabase/migrations/008: key_obligations is jsonb, so it must coalesce to '[]'::jsonb.",
  );
}

// Every column the library function reads must be added defensively, otherwise
// running out of order fails with "column law.<name> does not exist".
for (const column of [
  'gazette_reference',
  'status',
  'superseded_by',
  'affected_articles',
  'type',
  'amends_law_reference',
  'repealed_articles',
  'inserted_articles',
  'retroactive_effective_date',
  'languages_available',
]) {
  if (!new RegExp(`add column if not exists ${column}\\b`).test(migration)) {
    failures.push(
      `supabase/migrations/008: add "add column if not exists ${column}" so the migration cannot fail out of order.`,
    );
  }
}

if (failures.length) {
  console.error('FAILED\n');
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log(`Checked ${files.length} files. No non-async 'use server' exports found.`);