# Rengera AI — session checkpoint

Last reconciled: 2026-10-24. This file is a short resume aid; `TASKS.md` owns task status and specifications own requirements.

## Checkpoint

- Branch at session start: `main` tracking `origin/main`.
- The user already had an in-progress pnpm/repository cleanup in the worktree: `web/android/` and `web/out/` staged for removal, `web/bun.lock` staged for removal, `web/pnpm-lock.yaml` and `web/pnpm-workspace.yaml` untracked, plus edits to web package/config/layout/scripts and Vercel config. Preserve these changes; do not reset or replace them.
- Documentation foundation is complete. The current product task is `WEB-001` in `TASKS.md`; the user has paused the broader redesign goal for now.
- The duplicate Capacitor Android project was removed in the user worktree; Flutter under `mobile/` is canonical. Capacitor config/dependencies and web compatibility components still exist as cleanup candidates.

## Repository map

- `web/`: Next.js 15 / React 19 app, server actions, Supabase migrations and operational scripts.
- `mobile/`: Flutter app; onboarding/login/theme/shell prototype, not feature parity.
- `docs/`: product, architecture, data, contracts, design, security, plan, verification, source and release guidance.
- `server/`: not present; do not treat as an existing service.
- Root `AGENTS.md`, `TASKS.md`, `CODEX-TASK-PROMPT.md`, README and this checkpoint govern future sessions.

## Durable constraints

- Separate subproject dependencies. All model calls go through `web/lib/space-bunny.ts` and env-selected model/provider settings.
- Never overwrite `laws.raw_content`; reject invalid classifications; keep the service-role key server-only; public access is read-only; admin writes check a verified session; owner-scope private user records.
- Deterministic safety/retrieval/citation guards precede model refinement. Preserve source text verbatim and label review/status accurately.
- Design tokens: `#09090b`, `#d8b485`, 3px radius; mobile mirrors web through `RengeraColors`.
- The `web/android` removal did not remove all Capacitor references. Recheck actual imports/use before deciding whether to remove remaining web compatibility code/dependencies.

## Open prerequisites

- `TASKS.md` records first web redesign slices and decisions still needed for launch boundary, corpus/review ownership, privacy/retention, mobile API/offline scope, and any service extraction.
- Hosted Supabase migration state, backups, corpus inventory and deployment secrets were not inspected. Do not infer migration status from local SQL.
- No external systems were contacted and no live credentials were read.

## Verification context

- Web typecheck, `verify`, production build, and Python ingestion checks passed on 2026-10-24. ESLint config was repaired to use FlatCompat but the retry stalled and was stopped, so lint remains unverified. See `docs/08-TEST-STRATEGY.md`.
- Flutter/Dart test files were not found in the current `mobile/lib` project; `mobile/ios/RunnerTests/` contains a native iOS test file only.
- See `docs/08-TEST-STRATEGY.md` for commands and coverage boundaries. Record actual outcomes there only when they materially change durable environment knowledge.
