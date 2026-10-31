# 02 — System architecture

> **Current baseline.** The requested V2 target is documented in [`v2/02-SYSTEM-ARCHITECTURE.md`](v2/02-SYSTEM-ARCHITECTURE.md). The Next.js shape below is implemented today; it is not the final target.

## Current shape

The repository currently ships two applications: the Next.js web app in `web/` and the Flutter prototype in `mobile/`. The approved V2 target adds a new React/Vite frontend in `platform/` and a Python/FastAPI backend in `server/`; both are under construction and are not shipped. `web/` remains the runnable migration baseline.

```mermaid
flowchart LR
  Citizen[Citizen browser] --> Next[Next.js web app]
  Admin[Administrator browser] --> Next
  Flutter[Flutter app shell] --> MobileAuth[/api/mobile/auth]
  USSD[USSD provider] --> USSDRoute[/api/ussd]
  Next --> Actions[Server actions and route handlers]
  Actions --> Supabase[(Supabase Postgres and Storage)]
  Actions --> AI[Space Bunny OpenAI-compatible API]
  USSDRoute --> Supabase
```

**Current evidence (2026-10-28):** `web/app/` contains the App Router page, server actions, share pages and API routes; `web/lib/` contains auth, retrieval, PDF parsing and model adapters; SQL migrations live in `web/supabase/migrations/`. Flutter source is under `mobile/lib/`. The approved V2 directories `platform/`, `server/` and `contracts/` were absent when this inspection began; untracked V2 scaffolding now exists in the worktree. Presence is not completion: implementation checks and task status belong in `TASKS.md`.

## Component responsibilities

| Component | Responsibility | Current boundary |
| --- | --- | --- |
| `web/app/` | Request entry points, pages, server actions and route handlers | Next.js 15 App Router monolith |
| `web/components/app/`, `chat/`, `landing/`, `brand/`, `ui/` | Citizen/admin surfaces, visual sections and reusable UI | Client-facing React components; no privileged DB key |
| `web/lib/` | Auth, Supabase clients, legal parsing, retrieval, safety and model provider | Server-only modules must stay server-only |
| `web/supabase/migrations/` | Versioned PostgreSQL functions, tables, policies and storage setup | Ordered 001–016 locally; hosted state unknown |
| `web/scripts/` | Crawling, ingestion, password hashing and repository verification scripts | Operational tools; some paths are not deployed request handlers |
| `mobile/` | Native Flutter application | Prototype shell; current UI does not yet call a complete citizen API |
| Supabase | Shared legal corpus, accounts and product records | RLS/RPC plus server-side service-role access |
| Space Bunny adapter | Model calls, optional embeddings and fallback provider | All AI calls from web route through `web/lib/space-bunny.ts` |

## Current flows

### Citizen question

1. `web/components/app/ChatInterface.tsx` submits through `web/app/actions.ts` (`generateLegalAdvice`).
2. Deterministic safety/small-talk/no-source guards run before model work where applicable.
3. `web/lib/supabase-retrieval.ts` obtains candidate legal context from Supabase search functions.
4. The provider adapter calls the configured model only after context is available.
5. Citation validation and response construction happen in the web server path; source records link back to law/article content.

Verify behavior against current code when changing this path; the 2026-10-20 audit describes an earlier snapshot.

### Law ingestion

1. An administrator uses the web ingestion surface and a server action in `web/app/legal-actions.ts`.
2. The request validates the administrator session and file/input limits.
3. The web PDF parser and classification parser create separate source and metadata values.
4. Supabase stores law/article data and source-PDF metadata/storage according to migrations.
5. Review/approval state controls trust labels; applying the local SQL chain to a hosted project is a separate operational task.

Python crawling/ingestion scripts exist under `web/scripts/`; verify whether a particular script is invoked by a deployed path before describing it as production ingestion.

### USSD and mobile

- USSD is handled by `web/app/api/ussd/route.ts`, backed by Supabase RPCs and intentionally outside the LLM path.
- `web/app/api/mobile/auth/route.ts` is the current mobile auth endpoint. It calls `signIn`, which creates the same HTTP-only cookie session used by web and returns account data without a bearer token. Flutter's Dio login path navigates to `/app` but does not persist a cookie/token; `initialRoute()` separately looks for a SharedPreferences token. Treat mobile auth/session as an unresolved implementation defect, not as working token auth. Do not assume the shell has complete chat/library APIs or offline sync.
- Flutter dependencies include Riverpod, Dio, Drift and secure storage, but dependency presence is not implementation evidence for offline features.

## Target structure and evolution

The approved target is a new React frontend in `platform/` using Vite, TanStack Router and TanStack Query, a dedicated modular FastAPI backend in `server/`, versioned OpenAPI contracts in `contracts/`, and generated TypeScript/Dart clients. The user also requested staff RBAC, scalable RAG and bounded workflows. Migrate in reviewed slices while preserving the current app in `web/`. The first server should be modular, with an explicit answer pipeline and a separate worker when required.

`platform/` owns UI and generated API clients; `server/` owns authentication, authorization, data access, safety, retrieval, orchestration and provider secrets. Flutter never imports `web/` or `platform/` runtime code. SQL migrations remain in `web/supabase/migrations/` until a recorded ownership move. See [`v2/02-SYSTEM-ARCHITECTURE.md`](v2/02-SYSTEM-ARCHITECTURE.md) and the [approved layout decision](09-DECISIONS-AND-SOURCES.md#approved-v2-repository-layout-2026-10-28).

Hosting and queue vendor, vector search and advanced workflow configuration require operational evidence and evaluation. Existing `docs/research/rengera-system-research.md` is a historical audit; its proposals are not automatically adopted.

## Failure boundaries

- If retrieval returns no adequate context, return an honest abstention and source-search path; do not generate a legal answer without grounding.
- If emergency detection matches, route immediately without waiting for retrieval/provider availability.
- If a model or parser fails, return an explicit safe error or fallback; do not persist invalid classifications.
- If Supabase/provider configuration is missing, distinguish unavailable configuration from empty corpus or successful output.
- Mobile offline behavior is not specified as complete; do not silently queue mutations until ownership, conflict and expiry behavior is approved.
