#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const specUrl = new URL('../../contracts/openapi/v1.json', import.meta.url);
const specPath = fileURLToPath(specUrl);
const displayPath = 'contracts/openapi/v1.json';

if (!existsSync(specPath)) {
  console.error(
    [
      '',
      `generate:api failed: ${displayPath} is missing.`,
      '',
      'The generated API client cannot be produced until the versioned OpenAPI',
      'contract exists. Export it from the FastAPI application (or add the',
      'agreed contract fixture), then run this command again.',
      '',
      'No files were changed.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

try {
  JSON.parse(readFileSync(specPath, 'utf8'));
} catch (error) {
  console.error(
    `\ngenerate:api failed: ${displayPath} is not valid JSON.\n${String(error)}\n`,
  );
  process.exit(1);
}

const result = spawnSync('pnpm', ['exec', 'openapi-ts'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`generate:api could not start the generator: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
