#!/usr/bin/env bun
/**
 * Static checks that stand in for `tsc` when dependencies are not installed.
 *
 * Two real build breaks in this project were invisible to parsing and only
 * surfaced on Vercel: a non-async export in a 'use server' module, and a
 * duplicate icon import. This script catches that class of problem plus the
 * other common one, an imported name that the target module never exports.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOTS = ['app', 'lib', 'components', 'scripts'];

function walk(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(full)) {
      out.push(full);
    }
  }
  return out;
}

const failures: string[] = [];
let checkedImports = 0;

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;

const PROJECT_ROOT = process.cwd();

/** Resolve an import specifier to a file, handling the `@/` path alias. */
function resolveSpecifier(specifier: string, file: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(PROJECT_ROOT, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(file), specifier)
      : null;

  if (base === null) return null;

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

let scannedFiles = 0;

for (const file of ROOTS.flatMap((root) => (existsSync(root) ? walk(root) : []))) {
  scannedFiles += 1;
  const source = readFileSync(file, 'utf8');

  // Duplicate named imports inside one file are a hard TS error (TS2300).
  const seen = new Map<string, number>();
  for (const match of source.matchAll(/^\s*import\s+(?:type\s+)?\{([^}]*)\}\s*from/gm)) {
    for (const raw of (match[1] || '').split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      const count = (seen.get(name) || 0) + 1;
      seen.set(name, count);
      if (count === 2) {
        failures.push(`${file}: duplicate import of "${name}" from one statement`);
      }
    }
  }

  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match[4];
    if (!specifier) continue;
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;

    const target = resolveSpecifier(specifier, file);
    if (!target) {
      failures.push(`${file}: cannot resolve import "${specifier}"`);
      continue;
    }

    // Verify named imports actually exist in the target.
    const named = [match[1], match[3]]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map((raw) => raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
      .filter(Boolean);

    if (named.length === 0 || !/\.(ts|tsx)$/.test(target)) continue;

    const targetSource = readFileSync(target, 'utf8');

    for (const name of named) {
      checkedImports += 1;
      const patterns = [
        new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`),
        new RegExp(`export\\s+(?:const|let|var|class|type|interface|enum)\\s+${name}\\b`),
        new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`),
      ];

      if (!patterns.some((pattern) => pattern.test(targetSource))) {
        failures.push(`${file}: "${name}" is not exported by ${specifier}`);
      }
    }
  }

  // Unused named imports. ESLint is skipped during the Vercel build
  // (eslint.ignoreDuringBuilds in next.config.ts), but tsc --noEmit still
  // reports them under noUnusedLocals, so they are worth failing on here.
  const body = source.replace(/^\s*import[^;]*?from\s*['"][^'"]+['"];?\s*$/gm, '');

  for (const match of source.matchAll(IMPORT_RE)) {
    const unusedCandidates = [match[1], match[3]]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map((raw) => raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
      .filter(Boolean);

    for (const name of unusedCandidates) {
      if (name === '*') continue;
      if (!new RegExp(`\\b${name}\\b`).test(body)) {
        failures.push(`${file}: unused import "${name}"`);
      }
    }
  }
}

if (failures.length) {
  console.error(`FAILED (${failures.length}):\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `All imports resolve. ${checkedImports} named imports checked across ${scannedFiles} files.`,
);