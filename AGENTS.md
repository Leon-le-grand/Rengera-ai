# Rengera AI — AGENTS.md

Rules for any agent (human or AI) working in this repository. Read this first.

## Before starting ANY task

1. **Read `MEMORY.md`** at the repo root. It is the single source of truth: architecture, data flow, code conventions, gotchas, verification steps, and open work. A new agent should be able to pick up and continue production work after reading it without re-exploring the whole codebase.
2. **Check the current state** — `git status` and `git log --oneline -10` — so you know what's staged/committed and what the working tree looks like. Uncommitted changes may represent work-in-progress that you should build on, not discard.

## Architecture

- Parent project with three subprojects: `web/`, `mobile/`, `server/`. Never mix their dependencies.
- Web is Next.js 15 App Router + React 19 + TypeScript + Tailwind 4. Mobile is Flutter 3.38. Data lives in Supabase (Postgres + pgvector + Storage).
- All AI calls go through `web/lib/space-bunny.ts`. Never hard-code a model ID — read `SPACE_BUNNY_MODEL` / `SPACE_BUNNY_API_URL` / `SPACE_BUNNY_API_KEY`. The model must be switchable by env var with zero code change.

## Conventions you must respect

- **No code comments** unless the user explicitly asks.
- Follow existing patterns exactly. When in doubt, copy the closest existing file (e.g. a new server action mirrors `web/app/legal-actions.ts`; a new Flutter screen mirrors `mobile/lib/features/shell/app_shell.dart`; a new migration mirrors `web/supabase/migrations/013_add_review_gate_and_ocr_flag.sql`).
- Never edit generated files: `web/.next/*`, `mobile/build/*`, `mobile/.dart_tool/*`, `mobile/android/app/build/*`.
- All user-facing strings go through the i18n system (`web/lib/answer-language.ts` `UI_STRINGS`), added for all three languages (en, rw, fr) before compiling.
- New backend endpoints must be: server action in `web/app/*-actions.ts`, gated on `getAdminSession()` for writes, and asserted by `web/scripts/verify-server-actions.ts`.
- **Roles are never mapped to localized labels.** Role values are bare English (`admin`, `staff`, `user`) and rendered as-is. Do not create `roleLabel`-style helpers.
- JS/TS is single-quote enforced by eslint. Dart follows `flutter_lints`.

## Pipeline for any feature that touches the API

1. Backend changes (server actions, migrations).
2. Frontend code (components, screens).
3. Verify: `cd web && bun run verify && bun run typecheck`, `cd mobile && flutter analyze`.
4. Run `bun run build` for the web app.

## Updating MEMORY.md — IMPORTANT

Every time you complete a task that adds or changes something durable about the system — new endpoints, new DB tables, new permission grants/modules, new pages/components, new conventions, new gotchas, new verification facts — **you MUST update `MEMORY.md`** to reflect it before you finish. This is how future agents "just pick up and continue".

Rules:
- Keep it concise and factual. Update existing sections in place rather than appending duplicates.
- Add new endpoints to the relevant feature section.
- Record new grants/modules in the Permissions section.
- Record new conventions/gotchas/verification commands as you discover them.
- When in doubt, a small accurate edit is better than a big stale document. Do not delete info that is still true.
- Do NOT write the full history of every task — only durable facts, decisions, and current structure.

## Hard rules

1. **Never commit secrets.** `.env*` is gitignored; only `.env.example` is tracked. Keys live in Vercel env vars and `.env.local`.
2. **Never overwrite `raw_content`.** Metadata and source text are separate columns and stay separate.
3. **Never store an AI classification that fails schema validation.** Throw, don't insert.
4. **Service-role key is server-only.** No `NEXT_PUBLIC_` prefix, ever.
5. **Public access is read-only.** No anon write policies.
6. **Admin writes require a verified session.** Every server action checks `getAdminSession()` first.
7. **Deterministic first, model second.** TasteRank, retrieval scoring, and the citation verifier must work with no model. The model only refines.
8. **Fidelity over fluency.** Article text is sliced verbatim; never paraphrase at ingest.
9. **Fail safe, not silent.** A bad model returns nothing stored, never corrupt data.
10. **Keep the design system.** Dark canvas `#09090b`, gold `#d8b485`, 3px radius. Mobile mirrors web exactly via `RengeraColors`.

## Branch workflow

- `main` = production, always deployable. Vercel deploys from here.
- `dev` = integration. All new work lands here first.
- Feature branches off `dev`, merged back via PR.
- Never force-push `main`.

## Interaction expectations

- The user works interactively and often gives direction mid-task; adapt to the latest instruction (they frequently supersede earlier guidance in the same task).
- The user restarts the backend server themselves — after adding routes, tell them to restart so the new endpoints are live.
- Run lint/typecheck (`bun run verify`, `tsc`, `flutter analyze`) after completing a task and fix anything you introduced.

## Common issues & fixes

See MEMORY.md. Short list:
- "Server Action not found" — stale client tab after a deploy. Hard-refresh.
- `FreeTierError` from OpenCode inference — free models only answer inside OpenCode. Use a service-account key + paid model.
- Empty `package.xml` in Android SDK — copy from a sibling platform version.
- Gradle "does not provide JAVA_COMPILER" — point at a JDK (not JRE) path.
- Gradle "Unexpected lock protocol" — delete `~/.gradle/caches/build-cache-1`, retry.
- `flutter pub get` fails offline — needs DNS once to resolve advisories.
- Scanned PDFs — `extractPdfText` throws `ScannedPdfError`; run `--ocr` in the Python ingester.
- `bun run verify` fails on unused imports — remove them; CI must stay green.