# 09 — Decisions and sources

## Approved constraints

### V2 direction requested by the user

The user selected a React/Vite frontend using TanStack Router and Query, a dedicated Python/FastAPI server, OpenAPI-generated clients, staff management with server-enforced RBAC, scalable RAG and bounded configurable AI workflows. See [`docs/v2/`](v2/README.md) for the proposed contracts, migration and later simplification review. This is a target decision, not evidence of implementation or approval for production deployment, hosted writes, provider spend or external contact. Exact vendor, region, cost, quality thresholds and operational ownership remain to be established. Existing Next.js security and source-fidelity rules remain effective until their replacements are verified.

### Approved V2 repository layout (2026-10-28)

The user approved a parallel Wave build in which the V2 frontend is a new `platform/` React/Vite application, the V2 backend is a new `server/` FastAPI application, and versioned API artifacts live under `contracts/`. The current Next.js application in `web/` is preserved as the runnable legacy baseline until its capabilities are ported and accepted; it is not deleted or overwritten during migration. SQL migrations remain under `web/supabase/migrations/` until a separate recorded ownership move. This is a repository-layout decision, not a claim that V2 is shipped or that any environment has been deployed.

| ID | Decision | Authority / evidence |
| --- | --- | --- |
| A-01 | Separate `web/`, `platform/`, `server/`, `contracts/` and `mobile/` concerns; never mix dependencies | Repository `AGENTS.md` instructions supplied by the user and current manifests |
| A-02 | Current web stack is Next.js 15 / React 19 / TypeScript / Tailwind 4; mobile uses Flutter. V2 targets React/Vite in `platform/` and FastAPI in `server/`. | `web/package.json`, `mobile/pubspec.yaml`; V2 user direction |
| A-03 | Shared persistence is Supabase Postgres/Storage; privileged key stays server-only | `web/lib/supabase.ts`, `.env.example`, migrations 001–016 and repository instructions |
| A-04 | Current web AI calls use `web/lib/space-bunny.ts`; the V2 server adapter will assume that boundary at cutover. | `web/lib/space-bunny.ts`, `.env.example`, V2 direction |
| A-05 | Preserve `raw_content`, reject invalid classifications, public access is read-only, admin writes require verified session | Repository invariants, `web/app/legal-actions.ts`, `web/lib/auth.ts`, SQL migrations |
| A-06 | Deterministic safety/retrieval/citation behavior precedes model refinement | Repository instructions, `web/app/actions.ts`, `web/lib/safety.ts`, `web/lib/supabase-retrieval.ts` |
| A-07 | Dark canvas `#09090b`, gold `#d8b485`, 3px radius; Flutter token source is `RengeraColors` | Repository instructions, web styles and Flutter theme |
| A-08 | Current user request authorizes redesign, documentation and project organization | User instruction in this session; redesign must respect A-01–A-07 |
| A-09 | V2 uses a new `platform/` frontend and new `server/` backend; `web/` remains the preserved, runnable legacy baseline and keeps SQL migration ownership during migration | User instruction in this session (2026-10-28); `AGENTS.md` repository boundaries |

## Proposed, not yet materialized

| ID | Proposal | Gate before implementation |
| --- | --- | --- |
| P-01 | Redesign the citizen workspace source-first, with chat and library as primary tasks | Authorized by current request; task acceptance in `TASKS.md` |
| P-02 | Superseded as a final target: retain the current Next.js monolith during migration to the requested modular V2 server | V2 migration and cutover evidence in `TASKS.md` |
| P-03 | Make Flutter a usable native citizen app with offline capabilities | Decide client API, auth lifecycle, sync/conflict semantics and offline scope |
| P-04 | V2 includes a durable ingestion worker; evaluate vector search against the lexical baseline | Operational plan and evaluation; billing and multi-organization support remain outside approved scope |

## Current implementation decisions

| ID | Decision | Evidence and status |
| --- | --- | --- |
| I-01 | Next 15 ESLint presets are adapted into ESLint 9 flat config through `FlatCompat` | `web/eslint.config.mjs`; matches the [Next.js 15 ESLint guide](https://nextjs.org/docs/15/pages/api-reference/config/eslint), checked 2026-10-24. The lint run remains unverified. |

## Current evidence inventory

| Claim | Primary repository evidence | Checked |
| --- | --- | --- |
| Web dependencies and scripts | `web/package.json`, `web/pnpm-lock.yaml` | 2026-10-24; no tracked `vercel.json` was found in the current checkout |
| Flutter dependencies and features | `mobile/pubspec.yaml`, `mobile/lib/` | 2026-10-24 |
| Server actions/routes | `web/app/`, `web/lib/` | 2026-10-24 |
| SQL shape | `web/supabase/migrations/001`–`016` | 2026-10-24 |
| Project intent and earlier design | `docs/research/RESEARCH.md`, dated system audit | Source dates vary; re-check code |
| Current worktree changes | `git status --short --branch` | At session start 2026-10-24 |

No external technical research or hosted-service inspection was used to establish this baseline. Changeable framework details are taken from the local manifests. No legal, privacy or regulatory claim in this documentation is a compliance finding; those questions require current primary sources and qualified local counsel before they guide launch behavior.

The ESLint configuration change was separately checked against the Next.js 15 ESLint guide linked above. Runtime verification is still outstanding as recorded in `docs/08-TEST-STRATEGY.md`.

## Open decisions

- Product owner, launch scope, measurable release gates and primary user segment.
- Corpus sources, update responsibility, legal reviewer capacity, completeness/freshness target.
- Data retention, privacy and incident owners, vendor/data residency choices, counsel-approved legal wording.
- Mobile account/session migration and the offline first-release promise.
- Hosting/queue provider, region, capacity, cost and the measurements required to adopt semantic retrieval.
