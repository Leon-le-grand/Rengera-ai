# Rengera AI — proposed transformation plan v2

**Status:** research plan, 2026-10-28. No phase below is implemented by this document. This is a proposed sequence for the user's requested dedicated API and agent architecture; reconcile the approved architecture, security, data, interface and task documents before implementation. Keep the existing `WEB-001` work and user changes intact. A production deployment, hosted migration, corpus upload or paid provider call needs separate applicable authorization.

## Decisions and measurable starting point

1. Use Python/FastAPI, React/Vite with TanStack Router and Query, Supabase Auth, Hey API for TypeScript client generation and OpenAPI Generator for Dart as specified in `RESEARCH.md`. Run a representative prototype to validate compatibility and performance; nominate maintainers and pin versions. Assign environments, region, budgets and service objectives from the actual account and measurements.
2. Inventory actual deployed schemas, corpus versions, review states, clients, user accounts, secrets, integrations and backups through authorized read-only access. Capture existing behavior and open security gaps. Establish legal-review, retention, deletion, source licensing and incident owners.
3. Build a reviewed EN/RW/FR evaluation set and record baseline retrieval recall, claim support, citation accuracy, abstention, urgent routing, accessibility and latency. Include rural/low-data, diaspora, disability and shared-device scenarios through consented user research. Establish thresholds with responsible reviewers; do not invent numerical targets.

## Phase 1 — contracts and safety foundation

Define versioned OpenAPI schemas, error codes, pagination, request IDs, idempotency, ownership, limits, source/version references, language and review states. Define endpoints for session, corpus search and reader, question/answer, sharing and admin ingestion; define an SSE event contract if streaming is selected. Include cancellation, expiry, retry and compatibility policy. Specify explicit distinction between empty results, unavailable data, provider errors and ungrounded answers.

Fix or isolate current session revalidation and owner-scope gaps, including interest-profile access; protect service-role-backed telemetry and mutations against unauthorized use and abuse. Keep deterministic emergency routing available ahead of any model. Add representative contract, authorization and failure-path checks. **Gate:** signed-off API contract, security review, baseline evaluation and migration decision; no new endpoint may weaken existing safety or source fidelity.

## Phase 2 — dedicated API and identity

Create a separately managed `server/` only after the architecture decision is recorded. Build a stateless API with configuration validation, health/readiness, structured redacted logs, request tracing, distributed rate limits and a provider adapter. Introduce a web same-origin proxy and a Flutter bearer-token client. Adopt the selected identity system with browser and native session lifecycle, admin authorization, account status/revocation, key rotation, CSRF and exact CORS rules. Define migration mapping for `app_users`, existing cookies, ownership records and recovery; rehearse on a copy and support rollback without exposing credentials.

Move one read-only vertical slice first: library search → law → exact article and source. Then move chat behind a feature flag; compare old and new responses on the approved evaluation set and use canary traffic in staging. Preserve old paths until compatibility, authorization and rollback are demonstrated. **Gate:** web and Flutter contract tests, expired/revoked sessions, cross-user denial, CORS/CSRF, mobile restart/refresh/logout, load and outage tests pass against agreed criteria.

## Phase 3 — ingestion and scalable retrieval

Design migrations and a backup/restore plan before touching hosted data. Build a durable ingestion job with idempotent input, source hash, staged document version, extraction/OCR provenance, strict classification validation, preamble/article preservation, coverage report, review state and atomic publication. Use a queue and isolated workers for expensive work. Reconcile partial jobs and provide dead-letter review. Compare extracted text and article spans against source documents with human review.

Implement exact reference search and existing lexical retrieval first. Evaluate multilingual embeddings, hybrid fusion and optional reranking in shadow mode, including index versioning, reindexing, recall and cost. Promote only when measured improvement and source/citation checks meet agreed gates. Test no-source, stale or repealed material, model and embedding outages, partial ingestion, duplicate jobs and restore. **Gate:** no source overwrite or partial publication, reviewer approval and regression results for all supported languages.

## Phase 4 — configurable orchestration

Implement the selected small internal workflow runner with versioned, validated workflow configurations, model and tool interfaces, strict allowed operations, bounded parallelism, time/token/tool budgets, audit records, provider fallback and deterministic stop/abstention paths. Run workflow configurations in staging with adversarial documents and simulated tool failures. Add human authorization for privileged mutations; no agent receives unrestricted credentials. **Gate:** prompt injection, privilege escalation, output validation, citation support, retries and cancellation are exercised; evaluated workflows can be disabled or rolled back independently.

## Phase 5 — load, deployment and rollout

Create load profiles for web, mobile, USSD, provider latency and ingestion bursts. Establish connection, queue and concurrency budgets; test rate limits, backpressure, provider failure, DB saturation, queue recovery and graceful shutdown. Provision staging with separate secrets and data. Verify HTTPS, exact origins, CSRF, mobile redirects, monitoring, backups and a restore rehearsal. Select a hosting region from measurements and policy decisions. Deploy frontend, API and workers with independent versions, progressive traffic and observable rollback; keep corpus/schema migration recovery separate from code rollback.

**Release gate:** owner-approved performance, supported-answer and abstention thresholds; legal/source review and language evaluation; accessible device and network testing; security review; measured recovery; and authorized production changes. Do not claim high concurrency, correctness, corpus completeness or mobile feature parity before evidence exists.

## Phase 6 — citizen reach and continuous improvement

Pilot with representative Rwandan users and diaspora, including low bandwidth and assistive technology. Measure source access, task completion, language comprehension and unsafe or unsupported answers without collecting unnecessary sensitive text. Evaluate USSD gateway security and content limits. Decide offline scope, cache expiry, update/removal propagation and logout cleanup before building it. Iterate with legal reviewers on source freshness and language quality; track incidents and publish clear limitations.

## Ownership and unresolved choices

Assign a product owner for launch boundaries, a legal/content owner for source and review, an engineering owner for API and workflow contracts, an operations owner for capacity and recovery, and a privacy owner for retention and deletion. Account mapping, publication review, the embedding model, exact hosting region, measurable SLOs, budget, USSD provider and offline behavior require real operational evidence or an accountable owner. A new jurisdiction requires its own source, review and product decision. `TASKS.md` remains the execution queue; translate approved phases into dependency-ready tasks rather than marking this research as delivered implementation.

## Implementation work packages

The following order gives the next agent concrete, independently reviewable slices. A path is a target unless already present. Each slice includes failure cases and its own verification before it advances.

### 0. Reconcile direction and protect the worktree

- Record the user's React/TanStack, dedicated Python server and staff-management direction in `AGENTS.md` and the architecture, interfaces, security and decisions specifications. Replace the old admin-only mutation rule with an explicit permission-checked server rule only as part of that decision; retain the current rule for the existing Next app until cutover.
- Add dependency-ready implementation tasks to `TASKS.md` while preserving the existing `WEB-001` state and all user changes. Confirm actual branch and dirty files; do not switch or reset.
- Capture an inventory of current routes, actions, model calls, dependencies, user-visible behavior and migration chain; establish a dated baseline. Record current failure cases and acceptance gates.

### 1. API foundation and contract generation

- Create `server/pyproject.toml`, `server/app/main.py`, `server/app/api/v1/`, settings and a health/readiness endpoint. Add explicit schemas and stable operation IDs. Fail startup on missing required production configuration; never print secret values.
- Export deterministic `contracts/openapi/v1.json`. Set up a pinned Hey API generator under `web/` and a pinned Dart generator under `mobile/`; keep generated code separate from handwritten transport. Cover upload, auth, error, pagination and USSD media types; add a small streaming adapter with separately documented event schemas.
- CI validates the schema, checks unique operation IDs and incompatible changes, regenerates clients and fails on drift, then typechecks/builds the consumers. Contract tests send real HTTP requests and compare response status, shape and content type to the schema.
- Failure cases: stale generated code, incompatible generator/OpenAPI version, unmodelled 401/403/429, multipart errors, absent secrets and schema export changing between runs.

### 2. Authentication and authorization foundation

- Implement Supabase Auth verification, browser opaque session storage and refresh handling, CSRF, secure cookie settings, mobile bearer verification and account-status checks. Use separate staging identities and secrets. Define account mapping and re-authentication from `app_users`; do not transfer hashes unless the chosen provider explicitly supports a secure import.
- Add ordered migrations for role/permission tables, fixed initial role grants and audit records. Keep SQL under the existing migration owner until a recorded relocation. Make server policy dependencies deny by default, verify current identity on every request, enforce ownership in queries and check resource state.
- Implement `/v1/me`, admin staff list/invite/suspend/revoke and session revocation. Do not expose admin promotion in ordinary staff management. Protect the last admin and audit both successful and denied privileged actions.
- Verify anonymous, user, staff, admin, suspended, expired and revoked sessions; horizontal access with another user's ID; privilege escalation; forged role claims; concurrent revocation; CSRF/CORS; replayed invitations; logout and device restart. Test identity-service outages and stale capability snapshots.

### 3. Replace the web shell with React and TanStack

- Create `web/src/app/`, router and QueryClient; configure Vite, typed routes and static assets. Port theme/brand styles and the existing landing, login, citizen shell and administrator shell without discarding the current redesign.
- Add public routes for landing, login, chat, library and share; nested authenticated routes for account features; and permission-guarded staff/admin layouts. Use router `beforeLoad` and `Can` only for navigation and visibility. Use generated API options in loaders and components; implement private cache cleanup on session change.
- Route direct visits and refreshes to the SPA, retain deep links and share-token behavior, and supply prerendered public metadata plus dynamic server-rendered share metadata. Preserve accessible names, keyboard operation, focus, responsive behavior and all three answer languages.
- Verify direct URL navigation, refresh, forbidden routes, denied API calls, stale permissions, loading and unavailable states, shared devices, logout race conditions and SEO metadata. Run browser tests against controlled API fixtures and a live staging API.

### 4. Port public library and chat as vertical slices

- Move law search, detail, article order, timeline and compare to `server/app/api/v1/` and `repositories/`. Build equivalent React routes with generated clients and source links. Compare payloads and exact text against the old implementation using a fixed fixture corpus.
- Port emergency routing, language selection, lexical retrieval, evidence assembly, provider adapter and citation guard to server modules. Compare old and new behavior, including source-free abstention, repealed/unknown state and provider failure. Preserve administrator review labels accurately.
- Gate the new path behind a server-side feature flag. Shadow comparisons use sanitized fixtures or explicitly authorized data; never double-call a paid provider without approval. Verify no legal claims stream before final validation, and test request cancellation and timeout.

### 5. Staff dashboard, ingestion and jobs

- Port admin dashboard, source upload, draft edit and review screens. Staff permissions permit intake and draft work; publication requires admin `law.publish`. Implement `Can` around each control and apply the same policy independently in the API and job worker.
- Convert ingestion into staged source version → parse/classify/validate → atomic publication and index promotion. Add persistent job state, idempotency keys, retry/dead-letter handling, signed worker delivery and audit. Preserve PDF hash, extracted text, article order, preamble and review state.
- Verify failed classification stores no partial metadata, failed article insert cannot delete current published articles, duplicate delivery has one effect, unauthorized staff cannot publish, and interrupted reindex leaves the old index usable.

### 6. Flutter and other existing features

- Replace the hard-coded mobile auth endpoint flow with a configured Supabase Auth native session and generated Dart client. Persist session material in platform secure storage, refresh, revoke, clear caches on logout and handle expiry. Implement a citizen chat/library/reader slice after auth passes; no service-role credentials in app bundles.
- Port deadlines, share, feedback, alerts, analytics, contract review and USSD deliberately, applying owner checks, budgets, rate limits and documented response contracts. Preserve existing public share expiry and do not assume every present UI is production-ready.
- Verify Android/iOS build and session lifecycle, cross-account isolation, weak or interrupted networks, signed USSD callbacks and safe provider/DB failure. Offline synchronization remains disabled until its conflict and ownership semantics are accepted.

### 7. Retrieval, orchestration and rollout

- Add exact reference matching and lexical search to the new API; build a reviewed multilingual evaluation set before adding embeddings. Index versioned derived vectors separately and shadow-test reciprocal-rank fusion against lexical baseline. Record per-language recall, unsupported answers and citation/claim support.
- Implement workflow registry, typed steps, allowlisted tool gateway, budgets, cancellation, deterministic safety and citation checks. Track workflow/config/provider versions; apply the same API authorization to every tool operation. Test malicious source text, fabricated references, excessive loops, schema failures, provider timeout and retries.
- Provision isolated staging: Cloudflare Pages/proxy, Cloud Run API and worker, Cloud Tasks, Supabase, secret management and monitoring. Test connection budgets, load, backpressure, timeout, autoscaling, restore and rollback. Set production values from observed workload and the owner's budget.
- Cut over one feature at a time, compare contract and user outcomes, and retain a documented rollback to the old application until release gates pass. Remove old Next handlers and dependencies only after traffic, scheduled jobs and mobile clients are migrated. Record actual checks and owners in the handoff.

## RAG and workflow implementation handoff

Implement these as separate pull requests or cohesive slices, keeping a runnable old path until each cutover is accepted:

1. **Source version contract:** design version/article/passage/offset schemas, review states and migration rollback; verify source hashes, preamble, exact extracted text and document history against fixtures. Hosted data remains untouched until separately authorized.
2. **Atomic ingestion:** build staged upload and job state, idempotent worker delivery, classification validation and transactionally published source/version pointers. Exercise crash, duplicate delivery, PDF-storage failure and rollback. Do not delete the currently published articles on partial failure.
3. **Retrieval API:** implement exact-reference and lexical candidate services, status and publication filters, amendment links, evidence packaging and no-match/error distinction. Verify cross-language references, missing articles, unknown/repealed status and pagination with a fixed corpus.
4. **Answer API:** implement safety-first synchronous `POST /v1/answers`, typed input and output, provider adapter, bounded deadlines, evidence IDs, structured claims, citation validation, abstention and safe error envelopes. Verify no model call for urgent or ungrounded questions and no uncited final claims.
5. **Evaluation harness:** create versioned reviewer-labelled multilingual fixtures, evaluation commands and reports for retrieval, claim support, abstention, safety and performance. Keep release thresholds unset until responsible reviewers and operators establish them; record sample size and results.
6. **Workflow registry:** add typed graph schemas, graph validation, immutable versions, lifecycle transitions and admin permissions. Test rejected unknown tools, unbounded loops, disabled models, stale approvals and unauthorized activation.
7. **Tool gateway:** implement schemas, allowlists, per-tool policy, owner-scoped queries, side-effect approval, idempotency, deadlines and audit. Exercise prompt injection, forged identity, privilege changes, duplicate calls and unauthorized mutations.
8. **Provider and model profiles:** store versioned configuration and secret references, never secret values in client output. Implement timeouts, concurrency limits and evaluated fallback; test provider outage, malformed output, invalid settings, secret rotation and fallback failure.
9. **Hybrid retrieval:** benchmark a multilingual embedding model against the fixed lexical baseline; build and backfill a separately versioned pgvector index. Promote only after measured quality and operational review; verify rollback and lexical-only operation on failure.
10. **Streaming or background answers:** only after the synchronous path is accepted, decide whether latency justifies it. If implemented, specify SSE events, session-bound access, retention, reconnect, cancellation and final-answer validation in the contract and client adapters.

## Verification and handoff record

For each slice record the commit or worktree state, exact commands and pass/fail/not-run results, fixture/evaluation version, known limitations, and the next ready task. Test direct API access as well as UI visibility; generated clients and `Can` are not authorization controls. Compare the generated OpenAPI and both clients in CI. Include load, accessibility and device checks when the relevant path exists. A local check cannot establish hosted database state, legal correctness, provider quality, production capacity or deployment readiness.
