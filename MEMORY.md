# Rengera AI — session checkpoint

Last reconciled: 2026-10-28. This file is a short resume aid; `TASKS.md` owns task status and specifications own requirements.

## Checkpoint

- Current branch: `feat/v2-rebuild`; local `dev` is 15 commits behind. The worktree contains user changes in `.gitignore`, `AGENTS.md` and related files; preserve them and do not switch branches, reset or rewrite history.
- `V2-001` and `V2-002` are DONE; `docs/v2/BASELINE.md` records the source-backed `web/` inventory, gaps and check results.
- `V2-003` is the sole `DOING` task. TypeScript client generation, OpenAPI 3.1 schema validation, unique-operation-ID and deterministic-rendering checks, and checked-in generated client drift are complete. Remaining V2-003 work: pinned OpenAPI Generator Dart client, Dart compilation, representative HTTP contract and backwards-compatibility checks, and upload/USSD contract definitions when those endpoints land.
- `WEB-001` is `BLOCKED`, handed off 2026-10-28, never DONE. Its `web/` redesign and source-level checks remain intact; the rendered/responsive/accessibility review was not run under the user's no-launch instruction, and the work migrates through `V2-013`.
- Approved V2 layout: new React/Vite frontend in `platform/`, Python/FastAPI backend in `server/`, versioned contracts in `contracts/`; legacy `web/` stays the current product and runnable migration baseline. SQL migrations remain under `web/supabase/migrations/`. Recorded as decision A-09 in `docs/09-DECISIONS-AND-SOURCES.md`.
- Parallel build wave has delivered substantial local slices for `V2-004`, `V2-005`/`V2-006`, `V2-008`, `V2-009`, `V2-010`, `V2-012` and `V2-013`; their `TASKS.md` progress entries record actual checks. They remain `TODO` because hosted verification, browser/accessibility review and remaining acceptance criteria are outstanding.
- The duplicate Capacitor Android project was removed in the user worktree; Flutter under `mobile/` is canonical. Capacitor config/dependencies and web compatibility components still exist as cleanup candidates.

## Repository map

- `web/`: Next.js 15 / React 19 product, server actions, Supabase migrations and operational scripts; preserved baseline.
- `platform/`: approved V2 React 19/Vite frontend with TanStack Router and Query; under construction.
- `server/`: approved V2 Python/FastAPI backend and worker target; under construction.
- `contracts/`: versioned OpenAPI contracts and generated-client policy.
- `mobile/`: Flutter app; onboarding/login/theme/shell prototype, not feature parity.
- `docs/`: product, architecture, data, contracts, design, security, plan, verification, source and release guidance; `docs/v2/BASELINE.md` is the current-state evidence.
- Root `AGENTS.md`, `TASKS.md`, `CODEX-TASK-PROMPT.md`, README and this checkpoint govern future sessions.

## Durable constraints

- Separate subproject dependencies. Current web model calls go through `web/lib/space-bunny.ts`; the V2 server adapter takes over only at a verified cutover.
- Never overwrite `laws.raw_content`; reject invalid classifications; keep the service-role key server-only; public access is read-only; admin writes check a verified session; owner-scope private user records.
- Deterministic safety/retrieval/citation guards precede model refinement. Preserve source text verbatim and label review/status accurately.
- Design tokens: `#09090b`, `#d8b485`, 3px radius; mobile mirrors web through `RengeraColors`.
- The `web/android` removal did not remove all Capacitor references. Recheck actual imports/use before deciding whether to remove remaining web compatibility code/dependencies.

## Open prerequisites

- `TASKS.md` records active V2 slices and blocked/legacy work, with unresolved launch boundary, corpus/review ownership, privacy/retention, mobile session/offline scope, hosting and operational decisions.
- Hosted Supabase migration state, backups, corpus inventory and deployment secrets were not inspected. Do not infer migration status from local SQL.
- No external systems were contacted and no live credentials were read. V2 `platform/`, `server/` and `contracts/` implementation checks belong to their implementation agents, not this documentation slice.
- Dart client generation remains unconfigured and uncompiled; do not mark `V2-003` DONE until it is complete.

## Verification context

- Server: `cd server && uv run ruff check .` pass; `uv run pytest -q` 246 passed (1 warning); `uv run python -m scripts.export_openapi --check` pass; OpenAPI contract validated with `openapi-spec-validator`.
- Platform: `cd platform && pnpm lint` pass (0 errors/warnings); `pnpm typecheck` pass; `pnpm test` 12 files, 94 tests pass; `pnpm build` pass; `pnpm generate:api` pass and generated client unchanged.
- Web: typecheck, `verify`, production build and Python ingestion checks passed on 2026-10-24. ESLint config was repaired to use FlatCompat but the retry stalled and was stopped, so lint remains unverified.
- Flutter/Dart: checks not run; `mobile/` remains onboarding/login/theme/shell scope.
- No browser end-to-end run against live API/Postgres/Supabase has been performed.