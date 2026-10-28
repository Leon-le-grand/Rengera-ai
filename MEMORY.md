# Rengera AI — session checkpoint

Last reconciled: 2026-10-28. This file is a short resume aid; `TASKS.md` owns task status and specifications own requirements.

## Checkpoint

- Current branch: `main` tracking `origin/main`; the worktree contains user web redesign and documentation changes. Preserve them; do not switch branches or reset.
- `WEB-001` remains the sole `DOING` task; its remaining rendered review was not run under the user's no-launch instruction. See `TASKS.md` for actual checks and the V2 queue.
- The user requested a React/TanStack frontend, dedicated FastAPI server, OpenAPI clients, staff RBAC, RAG and bounded workflows. `docs/v2/` documents the target; the numbered docs remain the current-system baseline. Root `TASKS.md` is the sole execution queue. V2 is not implemented.
- The duplicate Capacitor Android project was removed in the user worktree; Flutter under `mobile/` is canonical. Capacitor config/dependencies and web compatibility components still exist as cleanup candidates.

## Repository map

- `web/`: Next.js 15 / React 19 app, server actions, Supabase migrations and operational scripts.
- `mobile/`: Flutter app; onboarding/login/theme/shell prototype, not feature parity.
- `docs/`: product, architecture, data, contracts, design, security, plan, verification, source and release guidance.
- `server/`: requested V2 target, not present; do not treat as an existing service.
- Root `AGENTS.md`, `TASKS.md`, `CODEX-TASK-PROMPT.md`, README and this checkpoint govern future sessions.

## Durable constraints

- Separate subproject dependencies. Current web model calls go through `web/lib/space-bunny.ts`; the V2 server adapter takes over only at a verified cutover.
- Never overwrite `laws.raw_content`; reject invalid classifications; keep the service-role key server-only; public access is read-only; admin writes check a verified session; owner-scope private user records.
- Deterministic safety/retrieval/citation guards precede model refinement. Preserve source text verbatim and label review/status accurately.
- Design tokens: `#09090b`, `#d8b485`, 3px radius; mobile mirrors web through `RengeraColors`.
- The `web/android` removal did not remove all Capacitor references. Recheck actual imports/use before deciding whether to remove remaining web compatibility code/dependencies.

## Open prerequisites

- `TASKS.md` records web redesign and V2 slices, with unresolved launch boundary, corpus/review ownership, privacy/retention, mobile session/offline scope, hosting and operational decisions.
- Hosted Supabase migration state, backups, corpus inventory and deployment secrets were not inspected. Do not infer migration status from local SQL.
- No external systems were contacted and no live credentials were read.

## Verification context

- Web typecheck, `verify`, production build, and Python ingestion checks passed on 2026-10-24. ESLint config was repaired to use FlatCompat but the retry stalled and was stopped, so lint remains unverified. See `docs/08-TEST-STRATEGY.md`.
- Flutter/Dart test files were not found in the current `mobile/lib` project; `mobile/ios/RunnerTests/` contains a native iOS test file only.
- See `docs/08-TEST-STRATEGY.md` for commands and coverage boundaries. Record actual outcomes there only when they materially change durable environment knowledge.
