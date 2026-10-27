# 02 — System architecture

## Current shape

The repository is a parent project with two present applications. There is no standalone `server/` service today.

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

**Current evidence:** `web/app/` contains the App Router page, server actions, share pages and API routes; `web/lib/` contains auth, retrieval, PDF parsing and model adapters; SQL migrations live in `web/supabase/migrations/`. Flutter source is under `mobile/lib/`. `server/` is mentioned in older planning docs but is absent from the checkout.

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

## Proposed structure and evolution

**Proposed:** retain the modular monolith while the product and corpus are being validated. Keep public UI, privileged server actions, Supabase SQL and provider configuration separated by responsibility. Prefer feature-cohesive modules inside the existing `web/` and `mobile/` roots over a large cross-stack rewrite.

Do not create `server/`, a background queue, a model registry, vector pipeline, or new auth service until an approved decision names a measured need, migration path, owner, operations plan and acceptance gate. Existing `docs/research/rengera-system-research.md` contains broader proposals; those are not approved by inclusion there.

## Failure boundaries

- If retrieval returns no adequate context, return an honest abstention and source-search path; do not generate a legal answer without grounding.
- If emergency detection matches, route immediately without waiting for retrieval/provider availability.
- If a model or parser fails, return an explicit safe error or fallback; do not persist invalid classifications.
- If Supabase/provider configuration is missing, distinguish unavailable configuration from empty corpus or successful output.
- Mobile offline behavior is not specified as complete; do not silently queue mutations until ownership, conflict and expiry behavior is approved.
