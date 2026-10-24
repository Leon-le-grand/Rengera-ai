# 09 — Decisions and sources

## Approved constraints

| ID | Decision | Authority / evidence |
| --- | --- | --- |
| A-01 | Separate `web/`, `mobile/` and future service concerns; never mix dependencies | Repository `AGENTS.md` instructions supplied by the user and current manifests |
| A-02 | Web stack is Next.js 15 / React 19 / TypeScript / Tailwind 4; mobile uses Flutter | `web/package.json`, `mobile/pubspec.yaml` (local version constraints are authoritative) |
| A-03 | Shared persistence is Supabase Postgres/Storage; privileged key stays server-only | `web/lib/supabase.ts`, `.env.example`, migrations 001–016 and repository instructions |
| A-04 | All AI calls use `web/lib/space-bunny.ts`; model/provider are environment-configurable | `web/lib/space-bunny.ts`, `.env.example`, repository instructions |
| A-05 | Preserve `raw_content`, reject invalid classifications, public access is read-only, admin writes require verified session | Repository invariants, `web/app/legal-actions.ts`, `web/lib/auth.ts`, SQL migrations |
| A-06 | Deterministic safety/retrieval/citation behavior precedes model refinement | Repository instructions, `web/app/actions.ts`, `web/lib/safety.ts`, `web/lib/supabase-retrieval.ts` |
| A-07 | Dark canvas `#09090b`, gold `#d8b485`, 3px radius; Flutter token source is `RengeraColors` | Repository instructions, web styles and Flutter theme |
| A-08 | Current user request authorizes redesign, documentation and project organization | User instruction in this session; redesign must respect A-01–A-07 |

## Proposed, not yet materialized

| ID | Proposal | Gate before implementation |
| --- | --- | --- |
| P-01 | Redesign the citizen workspace source-first, with chat and library as primary tasks | Authorized by current request; task acceptance in `TASKS.md` |
| P-02 | Keep a modular monolith until measured traffic/reliability needs justify service extraction | Architecture decision naming trigger, owner, operations and migration path |
| P-03 | Make Flutter a usable native citizen app with offline capabilities | Decide client API, auth lifecycle, sync/conflict semantics and offline scope |
| P-04 | Create durable ingestion worker, vector search, billing or multi-organization support | Separate explicit product/architecture approval and operational evidence |

## Current implementation decisions

| ID | Decision | Evidence and status |
| --- | --- | --- |
| I-01 | Next 15 ESLint presets are adapted into ESLint 9 flat config through `FlatCompat` | `web/eslint.config.mjs`; matches the [Next.js 15 ESLint guide](https://nextjs.org/docs/15/pages/api-reference/config/eslint), checked 2026-10-24. The lint run remains unverified. |

## Current evidence inventory

| Claim | Primary repository evidence | Checked |
| --- | --- | --- |
| Web dependencies and scripts | `web/package.json`, `web/pnpm-lock.yaml`, `vercel.json` | 2026-10-24 |
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
- Mobile API boundary and the offline first-release promise.
- Whether to split marketing, public workspace and authenticated app into separate routes.
- When traffic/cost/reliability measurements justify queue/service extraction or semantic retrieval.
