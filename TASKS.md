# Rengera AI — active work queue

Update this queue when a task starts or closes. Keep one `DOING` task for this working agent.

## V2 direction and queue precedence

The user requested React/Vite with TanStack Router and Query, a dedicated Python/FastAPI server, OpenAPI-generated TypeScript and Dart clients, server-enforced RBAC with admin-managed staff, scalable RAG and bounded agent workflows. `docs/v2/` documents this target; it is not shipped. The current Next application and its guards remain the migration baseline. Preserve the worktree and `WEB-001` progress. `WEB-001` remains the sole `DOING` item; after handoff, continue with the first dependency-ready V2 item. This root file is the sole authoritative execution queue.

The earlier `DEC-002` and `DEC-003` entries record historical open questions: the user has chosen a dedicated server direction, while mobile session migration, offline scope, hosting/region, operational ownership and release measures remain open until evidenced. Legacy tasks below remain as progress history and may be completed through mapped V2 slices; do not run competing implementations or mark either item done without its acceptance evidence.

## V2 implementation queue

Each item includes dependencies, outcome and required verification. Start the first dependency-ready item, record actual outcomes and failure cases, and leave exactly one item marked `DOING`. Tests listed here are required when implementing the corresponding slice; never claim a pass without running it. No hosted migration, deployment, corpus upload, provider spend or external contact without applicable authorization.

- [ ] `V2-001` · TODO — Complete V2 documentation reconciliation and task boundaries.
  - After: active `WEB-001` handoff; `docs/v2/RESEARCH.md`, `docs/v2/PLAN_RESEARCH.md`, `docs/v2/ARCHITECTURE_REVIEW.md`.
  - Outcome: update `AGENTS.md` and affected product, architecture, contracts, data, security, design, operations and decision specs to reflect the user's requested React/TanStack, FastAPI, staff RBAC and bounded agent direction; explicitly preserve existing-code authorization until cutover, source fidelity and supported languages. Map legacy tasks and retain user changes.
  - Verify: document precedence, local links, no contradictions about shipped status, dependencies and one `DOING` item.

- [ ] `V2-002` · TODO — Capture baseline behavior and migration inventory.
  - After: `V2-001`.
  - Outcome: list current routes, server actions, UI, roles, schema 001–016, provider calls, source/review behavior, UX and current check results. Record observed gaps and owner-scoping issues with evidence; avoid implying hosted state.
  - Verify: trace each inventory item to source and record runnable baseline checks and unavailable environment checks.

- [ ] `V2-003` · TODO — Define versioned OpenAPI contracts and generate clients.
  - After: `V2-001`, `V2-002`.
  - Outcome: define stable operation IDs, schemas, errors, auth, pagination, uploads, USSD media and compatibility; create deterministic schema export and pinned Hey API TypeScript/TanStack Query plus OpenAPI Generator Dart client processes.
  - Verify: schema validation, no duplicate IDs, generated-client drift checks, TypeScript/Dart compilation, representative HTTP contract and backwards-compatibility checks. Define SSE event contracts separately if adopted.

- [ ] `V2-004` · TODO — Build dedicated server foundation.
  - After: `V2-001`, `V2-003`.
  - Outcome: create isolated `server/` FastAPI application, validated environment, lifespan, health/readiness, structured redacted logging, request IDs, error envelope and request limits; keep dependencies in server manifest.
  - Verify: server static checks and tests, startup failure for missing production config, secret-redaction and OpenAPI contract checks.

- [ ] `V2-005` · TODO — Establish identity and session lifecycle.
  - After: `V2-003`, `V2-004`.
  - Outcome: Supabase Auth integration, browser server-side session and secure cookie/CSRF flow, Flutter bearer/token lifecycle, account-status and revocation checks, staged legacy `app_users` mapping and rollback plan.
  - Verify: login/signup, refresh, logout, expiry, suspension, revocation, OAuth PKCE callback, cookie/CSRF, cross-device and identity-provider outage tests with controlled identities.

- [ ] `V2-006` · TODO — Implement server RBAC and ownership.
  - After: `V2-004`, `V2-005`.
  - Outcome: ordered migrations and server policy for user/staff/admin roles, explicit permissions, resource ownership, active account checks, deny-by-default and audited privileged actions; no generic admin bypass or client-controlled grants.
  - Verify: full role/action matrix, anonymous access, foreign-owner IDs, forged roles, direct endpoint calls, stale/revoked sessions and concurrent policy changes; inspect RLS and service-role bypass paths.

- [ ] `V2-007` · TODO — Build admin staff-management lifecycle.
  - After: `V2-006`.
  - Outcome: authorized list, invite, revoke invitation, suspend/reactivate and session revocation, audit and final-admin protection; staff cannot elevate their role or publish sources.
  - Verify: API and UI permission tests, expired/replayed invitation, self-escalation, revoked sessions, audit and failure states. Sending invitations requires an authorized channel and explicit applicable permission.

- [ ] `V2-008` · TODO — Establish React/Vite, Router, Query and session-aware shell.
  - After: `V2-003`, `V2-005`, `V2-006`.
  - Outcome: typed public/citizen/staff/admin routes, auth provider, route guards, `Can`, generated API transport and permission-aware navigation; clean private cache on logout, account switch or revocation. Preserve existing redesign and tokens.
  - Verify: route refresh/deep links, direct unauthorized API calls, loading/error/403/401, cache races, keyboard and responsive behavior; build/typecheck and accessibility checks. No UI guard substitutes for server authorization.

- [ ] `V2-009` · TODO — Port landing, login, settings and share journeys.
  - After: `V2-008`.
  - Outcome: preserve landing and brand, accessible auth and account states, owned settings and expiring share routes; implement prerendered public metadata and dynamic share metadata without exposing private data in shared cache.
  - Verify: direct navigation, expiry/revocation, accessibility, SEO/social metadata, no secret leakage and browser history behavior.

- [ ] `V2-010` · TODO — Move law library, reader and source access end to end.
  - After: `V2-003`, `V2-004`, `V2-008`.
  - Outcome: versioned search, categories, law detail, exact ordered articles, preamble, provenance, status, review scope and amendment timeline; React reader and stable deep links.
  - Verify: current-source parity fixtures, article/source fidelity, no-result/error distinction, unreviewed and unknown status, responsive, keyboard and screen-reader checks. Maps to `WEB-002` only after its acceptance criteria pass.

- [ ] `V2-011` · TODO — Establish legal evaluation baseline.
  - After: `V2-002`, `V2-010`.
  - Outcome: versioned consented EN/RW/FR examples with reviewed relevant articles, unsupported questions, amendments, OCR errors, emergency and adversarial cases; record reviewer roles and metrics without inventing targets.
  - Verify: reproducible report, source/version provenance, sample counts, reviewer agreement and redaction; flag missing qualified review as blocked.

- [ ] `V2-012` · TODO — Port safety, retrieval and answer API.
  - After: `V2-003`, `V2-004`, `V2-010`, `V2-011`.
  - Outcome: deterministic urgent routing, exact-reference and lexical search, bounded evidence package, provider adapter, structured answer, source/citation checks and honest abstention; distinct unavailable error.
  - Verify: no model call for urgent/no-evidence cases, exact law/article/version pairing, model/parser failures, unsupported claims, provider outage, all supported languages and baseline evaluation.

- [ ] `V2-013` · TODO — Port citizen chat, emergency and evidence journeys.
  - After: `V2-008`, `V2-010`, `V2-012`.
  - Outcome: migrate existing `WEB-001` work to React routes; question composer, language, answer/evidence, source deep links, urgent help and distinct loading/abstention/error states.
  - Verify: API/UI contracts, keyboard/screen reader, phone/tablet/desktop, accessible async announcements, missing/expired session and provider/database failure. Maps to `WEB-001` only when its outstanding acceptance checks are satisfied.

- [ ] `V2-014` · TODO — Build source-versioned transactional ingestion and review.
  - After: `V2-006`, `V2-010`, `V2-011`.
  - Outcome: staged documents and jobs, original PDF/hash, exact extracted text, OCR provenance, articles/preamble and strict metadata validation; atomically publish reviewed version and index pointer. Staff drafts; admin publishes.
  - Verify: multilingual parser fixtures, malformed model output, duplicate job, upload/insert failure, interruption and rollback; current published source remains intact. Maps to `WEB-003` only after its acceptance criteria pass.

- [ ] `V2-015` · TODO — Add durable workers and ingestion dashboard.
  - After: `V2-006`, `V2-014`.
  - Outcome: durable queue delivery, authenticated worker, persistent jobs, idempotency, bounded retry/dead-letter and staff/admin job UI with real permission checks; select the queue after an operational comparison.
  - Verify: duplicate delivery, worker crash, timeout, dead-letter, authorization and reconciliation on a controlled environment.

- [ ] `V2-016` · TODO — Build versioned workflow runner and tool gateway.
  - After: `V2-006`, `V2-011`, `V2-012`.
  - Outcome: validated immutable workflow graphs, allowed tools and schemas, scoped identities, deterministic guards, budgets, cancellation, audit, evaluation/staging and rollback; no arbitrary code or secrets to models.
  - Verify: injection, unbounded graph, unauthorized tool/target, fabricated citations, malformed output, retries, parallel budget and provider failures.

- [ ] `V2-017` · TODO — Build model/provider configuration and AI administration.
  - After: `V2-006`, `V2-016`.
  - Outcome: environment-scoped provider/model profiles, secret references, per-task limits, evaluated fallback, workflow evaluation/activation/rollback and permission-gated admin UI.
  - Verify: denied staff/user access, no secret disclosure, config schema failures, provider outages, evaluated version promotion, audit and rollback; paid calls require explicit applicable authorization.

- [ ] `V2-018` · TODO — Evaluate and introduce hybrid retrieval.
  - After: `V2-011`, `V2-012`, `V2-014`.
  - Outcome: compare a multilingual embedding model and versioned pgvector index with lexical baseline; preserve exact references, source version and lexical fallback, promote only if agreed evidence and budget support it.
  - Verify: per-language recall, amendment and citation checks, latency/cost, missing embeddings, index backfill and rollback. No hosted index migration without explicit authorization.

- [ ] `V2-019` · TODO — Complete Flutter citizen vertical slice.
  - After: `V2-003`, `V2-005`, `V2-010`, `V2-012`.
  - Outcome: generated Dart API client, secure session persistence, refresh/logout, chat, library, article reader, language and urgent help; consistent source/status/review semantics. Offline sync remains separately scoped.
  - Verify: `flutter analyze`, meaningful tests, Android/iOS builds where available, token expiry/revocation, restart, owner isolation, low-connectivity and accessibility. Maps to `MOB-001`/`MOB-002` only when their gates pass.

- [ ] `V2-020` · TODO — Port secondary product and USSD contracts.
  - After: `V2-003`, `V2-006`, `V2-010`.
  - Outcome: deadlines, feedback, shares, alerts, analytics and existing contract/complaint surfaces only with documented functionality and authorization; provider-authenticated USSD with deterministic help and no model call.
  - Verify: per-owner isolation, anonymous policy, feedback/rate limits, share expiry, model grounding, webhook authentication/replay, localized errors and outage behavior.

- [ ] `V2-021` · TODO — Establish deployment, scaling and operational recovery.
  - After: `V2-004`, `V2-005`, `V2-012`, `V2-015`.
  - Outcome: staging infrastructure as code for frontend, proxy, API, workers, queue and secrets; separate environments, CORS/CSRF, tracing, distributed limits, alerts, connection budgets, backup/restore and staged rollback.
  - Verify: load profiles and measured p95/p99, queue saturation, retries, DB/provider failure, region latency, cost caps, authenticated proxy and restore drill; production setup/deployment requires applicable authorization.

- [ ] `V2-022` · TODO — Controlled rollout and retirement of Next server paths.
  - After: `V2-007`–`V2-021` as applicable to agreed release scope, `V2-024`, `DATA-001` and explicit production authorization; `V2-023` is required before adopting Jev.
  - Outcome: reviewer-approved corpus and quality gates, staged web/mobile rollout, tested rollback, client/session migration and removal of legacy Next handlers only after all callers are migrated. Record support, privacy and incident owners.
  - Verify: release checklist, accessibility and device checks, security and RAG evaluations, operational dashboard, backup/restore, smoke checks and actual target-specific evidence.

- [ ] `V2-023` · TODO — Evaluate optional document classifiers, including Jev.
  - After: `V2-011`, `V2-014`; before adopting a classifier in ingestion.
  - Outcome: compare deterministic rules, the existing classifier and Jev on reviewed Rwanda-specific multilingual documents; use a replaceable suggestion adapter only if it improves a defined task. Status, source provenance and publication remain evidence/review controlled.
  - Verify: per-class precision/recall, missed amendments, calibration, reviewer disagreement, latency, cost, retention and provider outage. External calls and spend require applicable authorization.

- [ ] `V2-024` · TODO — Implement component status and independent failure handling.
  - After: `V2-004`, `V2-012`, `V2-015`; coordinate with `V2-021`.
  - Outcome: liveness/readiness and timestamped healthy/degraded/unavailable/unknown status for API, database, storage, auth, search, provider, queue, worker, index and USSD; redacted traces, metrics, synthetic checks, alerts and documented ownership.
  - Verify: inject independent outages, prevent cascading restarts, observe correct status and fallback, test alert delivery and fail-closed protected operations in a controlled environment.

## Active

- [x] `DOC-001` · DONE — Establish the source-backed project documentation system and reconcile stale entry points.
  - After: none.
  - Spec: `docs/README.md`, `docs/01-PRODUCT-REQUIREMENTS.md`–`docs/11-RELEASE-HANDOFF.md`.
  - Done when: README, operating rules, queue, memory, session prompt, architecture/product specifications and subproject guides agree with inspected repository state; stale Android guide is clearly superseded.
  - Evidence: inspected manifests, routes/actions and migrations on 2026-10-24; all 30 local Markdown links resolve; web typecheck, `verify`, build and Python ingestion checks pass. ESLint was not verified after config repair; see `docs/08-TEST-STRATEGY.md`.

## Ready after DOC-001

- [ ] `WEB-001` · DOING — Redesign the citizen web workspace entry and chat surface around a clear question → grounded answer → source path.
  - After: `DOC-001`.
  - Spec: `docs/01-PRODUCT-REQUIREMENTS.md` (redesign outcomes), `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/05-DESIGN-SYSTEM.md`.
  - Done when: the public workspace makes language choice, question entry, source links, law/review status, abstention, and urgent help clear on desktop and mobile while preserving existing auth/data contracts and brand tokens.
  - Verify: applicable `pnpm --dir web run lint`, `typecheck`, `verify`, and `build`; review responsive, keyboard, focus, and screen-reader behavior.
  - Progress (2026-10-28): source-first entry, source/status cards, honest no-source/provider-error states, localized urgent guidance, accessible emergency-search label, and theme-aware warning colors implemented. Current `typecheck`, `verify`, and `build` pass; targeted ESLint reports 0 errors and 13 warnings; full lint stalled. Rendered/responsive/accessibility review remains not run per the no-launch request. Keep `DOING` until that review is resolved or formally handed off as blocked.

- [ ] `WEB-002` · TODO — Redesign the law library and article reader as the source-verification companion to chat.
  - After: `WEB-001`.
  - Spec: `docs/03-DATA-DESIGN.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/05-DESIGN-SYSTEM.md`, `docs/10-CONTENT-AND-DISCOVERY.md`.
  - Done when: a reader can search/navigate the currently indexed laws, inspect exact article text and provenance, and distinguish review/status/integrity states without fabricated completeness claims.
  - Verify: web lint/typecheck/build plus article deep-link, empty/error, responsive, and keyboard checks.
  - Readiness audit (2026-10-28): public `getTranslatedSummary` makes a model call and service-role write without an admin/rate guard; unknown status defaults to active; reader review copy overstates classification review; source URLs are not scheme-validated. Resolve before accepting the reader slice.

- [ ] `WEB-003` · TODO — Audit and complete the administrator ingestion/review flow against source-fidelity and approval invariants.
  - After: `WEB-001`.
  - Spec: `docs/03-DATA-DESIGN.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/06-SECURITY-OPERATIONS.md`, `docs/10-CONTENT-AND-DISCOVERY.md`.
  - Done when: upload/classify/review states are explicit, schema failures store nothing, source text remains unchanged, and privileged mutations enforce a verified admin session.
  - Verify: parser/route verification scripts and applicable manual security/error-state checks. Hosted writes are a separate approval gate.
  - Readiness audit (2026-10-28): update properties are not runtime-whitelisted; article replacement is non-atomic; source text is trimmed/normalized; classification review is labeled as human/legal verification; repeated PDF upload can clear its path. Resolve these before claiming safe ingestion; hosted transactional changes remain gated.

- [ ] `MOB-001` · TODO — Repair and document the Flutter authentication/session contract before expanding mobile features.
  - After: `WEB-001` and an approved mobile API/auth decision.
  - Spec: `docs/02-SYSTEM-ARCHITECTURE.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/06-SECURITY-OPERATIONS.md`, `docs/mobile/ARCHITECTURE.md`.
  - Done when: successful sign-in creates a session Flutter can safely reuse, session expiry/logout are handled, and no password/token is persisted insecurely or exposed in logs.
  - Verify: route/client contract checks, `flutter analyze`, meaningful Flutter auth tests, and cookie/token lifecycle checks against a controlled environment.
  - Readiness audit (2026-10-28): mobile auth endpoint returns no reusable session; Flutter uses a hard-coded production URL and does not persist a token. Resolve `DEC-002` before changing the contract.

- [ ] `MOB-002` · TODO — Turn the Flutter shell into the first usable citizen vertical slice (chat, library, reader) against documented contracts.
  - After: `MOB-001`, `WEB-001`, `WEB-002`, and an approved mobile API/data-access decision.
  - Spec: `docs/mobile/ARCHITECTURE.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/05-DESIGN-SYSTEM.md`.
  - Done when: sign-in state is handled safely and citizens can ask a question, open cited law text, and use the agreed offline behavior; no credential or service-role secret is bundled.
  - Verify: `flutter analyze`, `flutter test`, and Android build where the local toolchain permits; record unavailable checks as blocked.

- [ ] `DATA-001` · TODO — Reconcile hosted migration and corpus state with the local migration chain before any content load.
  - After: authorized Supabase access and explicit approval for the target environment.
  - Spec: `docs/03-DATA-DESIGN.md`, `docs/06-SECURITY-OPERATIONS.md`, `docs/11-RELEASE-HANDOFF.md`.
  - Done when: migration state is compared to 001–016, backup/restore path is known, and corpus inventory/review state is recorded before writes.
  - Verify: read-only schema/status inspection first; no upload or migration execution without the separate approval gate.
  - Local audit (2026-10-28): migrations 001–016 exist, but `check_schema_status.sql` covers only 001–007 and `RUN_ALL.sql` contains 7 sections. No local Supabase config or restore artifact was found. Hosted history, corpus and backups remain unknown pending explicit target-specific authorization.

## Parked / decision required

- `DEC-001` — Confirm launch boundary, corpus completeness target, reviewer capacity, supported channels, privacy/retention owner, and legal review requirements. The current product brief does not answer these.
- `DEC-002` — Resolve the current mobile auth mismatch and document V2 session migration, offline sync and conflict semantics before mobile feature work. The dedicated API direction is selected; the existing implementation remains incomplete.
- `DEC-003` — Dedicated server and bounded workflow direction requested by the user; exact hosting, queue, capacity and migration implementation still require evidence and an operational plan. No `server/` project is present today.

## Completed

- `DOC-001` — Source-backed documentation system and stale guide reconciliation. This completes documentation setup only; it does not complete product redesign or implementation.
