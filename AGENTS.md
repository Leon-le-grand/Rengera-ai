# Rengera AI — repository working rules

Read this file before changing the repository. It describes enduring constraints; current progress belongs in `TASKS.md` and `MEMORY.md`.

## Project and approved boundaries

- Rengera AI helps people find and understand Rwandan legal information from source laws. It is not represented in this repository as a law firm or a substitute for qualified legal advice.
- This repository contains `web/` (the preserved Next.js 15 baseline), `mobile/` (Flutter), and the V2 rebuild in `platform/` (React/Vite with TanStack Router and Query) and `server/` (Python/FastAPI), plus versioned contracts under `contracts/`. `web/` stays runnable until its capabilities are ported and accepted; do not delete or overwrite it during migration. Keep manifests, lockfiles and runtime code isolated by subproject.
- `web/`: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4 (legacy product baseline). `platform/`: React 19, Vite, TypeScript, TanStack Router and Query, Tailwind CSS 4 (V2 frontend). `server/`: Python/FastAPI (V2 backend). `mobile/`: Flutter/Dart. Shared persistence is Supabase Postgres and Storage. Versions in each local manifest are authoritative for that subproject; V2 remains under construction, not shipped.
- The web application is the current citizen and administrator product. Flutter is the canonical native application, but its implemented scope is currently onboarding, login, theme, and a shell prototype. Do not describe planned mobile features as shipped.
- The user requested admin-managed staff, a dedicated API/worker and bounded AI workflows in V2. Do not add billing, lawyer/organization roles, a new jurisdiction or another supported language without a separate product decision.

## Startup and documentation order

1. Read `AGENTS.md`, `TASKS.md`, and `MEMORY.md`.
2. Inspect `git status`, relevant manifests and implementation. Preserve unrelated staged, unstaged, and untracked work.
3. For target architecture and migration read `docs/v2/README.md`; use the older numbered `docs/` specifications for current-system evidence and enduring constraints, and check their evidence dates. Historical audits are not proof of current behavior.
4. Resume a valid `DOING` item, otherwise select `NEXT`, otherwise the earliest dependency-ready `TODO`.

Documentation ownership and the map are in `docs/README.md`. Requirements and constraints belong in their specifications; `TASKS.md` is the execution queue; `MEMORY.md` is a short resumption checkpoint. If they conflict, follow the precedence recorded in `docs/README.md` and reconcile the affected documents in the same change.

## Architecture and change boundaries

- Keep web, Flutter and future server dependencies isolated. Cross-platform communication goes through documented HTTP/API contracts or shared Supabase data access; never import one app's runtime code into the other.
- Preserve `web/` as the migration baseline until its V2 slices are ready; build new work in `platform/` and `server/`. V2 uses one modular FastAPI backend and a worker when needed; implementation follows the queue and versioned contracts. Do not share runtime code or dependencies between `web/`, `platform/` and `server/`.
- Current web model calls go through `web/lib/space-bunny.ts`. At V2 cutover the server provider adapter takes ownership; all model access remains centrally configured and controlled. Never hard-code a model ID in a feature.
- Do not add schema or dependencies to a different subproject. SQL changes are ordered migrations under `web/supabase/migrations/` and require a documented operational plan before application to a hosted database.
- Reuse the existing brand system. Dark canvas `#09090b`, gold `#d8b485`, 3px radius. Mobile mirrors web exactly through `RengeraColors`. The redesign may improve information hierarchy and interaction patterns while retaining these tokens unless the user approves a brand change.

## Domain invariants

1. Never commit secrets. `.env*` is ignored; only `.env.example` may be tracked, with placeholders only.
2. Never overwrite or paraphrase `laws.raw_content`. Keep source text and derived metadata in separate fields.
3. Reject classification output that fails schema validation; do not insert partial or malformed AI metadata.
4. The Supabase service-role key is server-only. Never expose it through `NEXT_PUBLIC_*`, client bundles, logs, or mobile configuration.
5. Anonymous access is read-only. No anonymous write policies.
6. In the current Next application, every administrator mutation checks a verified `getAdminSession()` before privileged access. The future server must verify the principal and enforce explicit permission and resource scope for every privileged action, including staff actions; user-owned records must be scoped to the verified user. Do not remove the current guard before a verified replacement exists.
7. Deterministic retrieval, safety routing, ranking fallbacks, and citation checks must remain useful without a model. The model may refine, never replace these guards.
8. Preserve source fidelity during ingestion. Keep article text verbatim, including preamble content; summaries and classifications are derived metadata.
9. Fail safely: provider, parser, or validation failure must not corrupt or silently persist data. Unsupported or ungrounded questions should be reported honestly.
10. Show source provenance and review status clearly. Never imply a law is human-verified unless its stored review state says so.

## Product and design rules

- Supported answer languages are English, Kinyarwanda, and French unless a user-approved change updates requirements and implementation together.
- Safety and urgent-contact paths must be easy to find, language-aware, and must not delay routing behind model generation.
- Make citation/source access, law status, and review state legible in the citizen experience. Do not make unsupported claims about corpus completeness, legal authority, or accuracy.
- Preserve responsive behavior, keyboard operation, visible focus, semantic labels, readable contrast, and screen-reader names when redesigning UI.
- Keep web and Flutter aligned with the same brand tokens and product terminology; do not claim full feature parity until it exists.

## Implementation loop

For each selected queue item: record its outcome and failure cases; implement one cohesive slice; run the checks required by its acceptance criteria; record actual pass/fail/not-run results; update the affected specification and task status; then continue to the next ready approved item in the same authorized session. Leave exactly one `DOING` task for this working agent.

Do not mark work `DONE` because a document was written or a command was planned. Do not claim checks passed unless they were run. If blocked, record the concrete prerequisite and work on independent approved tasks.

## Authorization and scope changes

- The active user request authorizes the current product redesign, documentation, and repository organization. Use the approved product direction and existing design system; do not expand into unrelated commercial or legal/compliance features.
- A user-selected task overrides queue priority while retaining its dependencies and constraints.
- Production deployment, applying migrations to a hosted database, uploading corpus data, incurring spend, deleting user data, changing credentials, or contacting external parties needs explicit applicable authorization and environment access.
- Material changes to product scope, architecture, supported languages, source fidelity, access control, or design tokens must be recorded as an approved decision before dependent implementation.
- Preserve user changes. Do not reset, clean, or overwrite unrelated work to make a check pass.

## Branch and handoff

- `main` is production; `dev` is integration; feature work normally branches from `dev` and returns through review. Never force-push `main`.
- If the current checkout has user changes or is on another branch, do not switch branches or rewrite history as part of routine work. Report the actual branch and leave the worktree intact.
- Keep `MEMORY.md` compact and update it after a meaningful change. At handoff, summarize delivered outcomes, changed files, checks actually run, unresolved decisions, and the next task.
