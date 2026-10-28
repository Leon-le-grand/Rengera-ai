# 08 — Verification strategy

> **Current commands and baseline.** V2 contract, RBAC, RAG, failure and migration checks are specified in [`v2/PLAN_RESEARCH.md`](v2/PLAN_RESEARCH.md) and root `TASKS.md`. These are acceptance requirements, not completed test results.

Verification is risk-based. A command proves only the behavior it covers. Record `PASS`, `FAIL`, `NOT RUN`, or `BLOCKED`; never infer hosted production correctness from a local check.

## Existing commands

| Area | Command (from repository root) | Evidence scope |
| --- | --- | --- |
| Web lint | `pnpm --dir web run lint` | ESLint findings in web source |
| Web type check | `pnpm --dir web run typecheck` | TypeScript compile-time checking |
| Web project verification | `pnpm --dir web run verify` | Existing import/server-action/classification/article parser verification scripts |
| Web production build | `pnpm --dir web run build` | Next.js production compilation/build, not production deployment |
| Flutter static analysis | `cd mobile && flutter analyze` | Dart analyzer output |
| Flutter tests | `cd mobile && flutter test` | Standard Flutter test runner; no Dart test files were found under `mobile/lib` at the audit date, so add meaningful coverage as mobile features are implemented |
| PDF ingestion utility | `cd web && python3 scripts/test_ingest_legal_pdf.py` | Python PDF ingestion regression checks, not the live Next ingestion path |

The commands above are reconciled to `web/package.json`, `mobile/pubspec.yaml`, and repository scripts on 2026-10-24. `web/package.json` does not declare a conventional `test` script. The mobile tree has a native iOS `RunnerTests` file but no Dart `*_test.dart` files. Do not invent a test command or imply current coverage is broader than the checked-in files.

## Required checks by risk

### Chat/retrieval changes

- EN/RW/FR questions with matched, missing, repealed and unreviewed source states.
- No-source abstention; model/provider unavailable; malformed/unsupported citations; deterministic emergency bypass.
- Verify cited law/article deep links and that exact source text is shown.

### Ingestion/data changes

- English, Kinyarwanda and French article headings, mixed-language documents, preamble, numbered subarticles and extraction failure.
- Invalid classification JSON/schema stores nothing; source `raw_content` remains unchanged; dedup/retry is safe.
- Authenticated admin can perform only intended writes; citizen/anonymous callers cannot; per-user product data remains owner-scoped.
- SQL migration review includes grants, RLS policies, RPC argument/return compatibility and rollback/backup plan.

### UI redesign

- Narrow phone, tablet and desktop layouts; loading, empty, error, long-answer and long-citation cases.
- Keyboard order, visible focus, screen-reader labels/announcements, text scaling, contrast, reduced motion and touch spacing.
- Citizen/admin state separation; no role-dependent control is treated as the security check.

### Mobile and release

- Auth expiry/refresh and secret handling; offline read/write/conflict cases only after behavior is approved and implemented.
- `flutter analyze`, `flutter test` and platform build where toolchain exists. Record SDK or signing limitations exactly.
- Hosted migrations, content uploads, live provider calls, deployment and external services require their own authorized environment checks; local build is not evidence for them.

## Verification record

Keep task-specific command output in the handoff or task notes only as needed. `MEMORY.md` stores durable environment limitations, not a transcript of every check.

### Baseline run on 2026-10-24

- **PASS:** `pnpm --dir web run typecheck`.
- **PASS:** `pnpm --dir web run verify` (imports, server-action exports, classification parser, article parser).
- **PASS:** `pnpm --dir web run build` (Next.js production build; no deployment performed).
- **PASS:** `cd web && python3 scripts/test_ingest_legal_pdf.py` (10 utility checks).
- **NOT VERIFIED:** `pnpm --dir web run lint`. Before the config edit it failed because `@rushstack/eslint-patch` could not identify its calling module. `web/eslint.config.mjs` was converted to the Next 15 `FlatCompat` pattern and dependencies/lockfile were updated. The subsequent lint run produced no output and was stopped after it stalled; rerun and resolve any findings before claiming lint passes.
- **NOT RUN:** Flutter analysis/tests/platform builds, hosted database checks, deployment, live model calls.
