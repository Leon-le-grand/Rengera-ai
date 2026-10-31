# V2 architecture review and simplification

**Assessment:** the frontend/backend boundary, source fidelity, server authorization and evidence-first answer flow are sound. The initial research overcommitted to multiple vendors, a generic agent platform, vectors and operational components before measuring need. Build a modular backend with one worker, one explicit answer pipeline and lexical retrieval first; expand only when evidence justifies complexity. These are design judgments, not measured production results.

V2 implementation targets `platform/` (React/Vite, `platform/src/`) and `server/` (FastAPI), with contracts in `contracts/`; the `web/` Next.js app remains the runnable legacy baseline and the source of the current-code gaps below until each slice is ported. See [the approved layout](../09-DECISIONS-AND-SOURCES.md#approved-v2-repository-layout-2026-10-28).

## Modularity and failure boundaries

Modules need explicit interfaces and independent failure tests, not separate deployments. Auth, library, retrieval, workflows, model adapter, ingestion and observability can share one FastAPI application. A background worker isolates long-running extraction. AI failure must not prevent law reading; vector failure must not prevent lexical search; worker failure must not corrupt the published corpus; authentication failure must deny privileged actions while allowing independent public paths where possible. Database and API remain critical dependencies. Liveness must not restart healthy instances due to external provider failure; component dashboards need timestamped healthy/degraded/down/unknown states and alerts.

The original proposal named Cloudflare, Cloud Run and Cloud Tasks prematurely. Compare hosting and durable queue options against actual cost, location and operator capacity. A queue needs persistent job state and a transactional outbox or equivalent reconciliation for safe dispatch; do not claim an upload was queued if its durable record was not stored.

## Critical current-code gaps to address

- The chat action can proceed with client-supplied article context when retrieval returned no sources; the current citation verifier returns without discarding if source list is empty. Fetch source text by server-side ID and distinguish user-provided text. See [current action](../../web/app/actions.ts).
- Ingestion currently upserts the law, deletes articles and inserts replacements as separate calls. Failure can leave partial state. Stage versions and publish atomically; preserve prior published records. See [legal actions](../../web/app/legal-actions.ts).
- Classification currently defaults absent legal status to active and language availability to all three; preserve unknown rather than claim unverified facts. See [classification](../../web/lib/legal-classification.ts).
- Search migration 015 can substitute the RLRC homepage for a missing document source URL. Show the source as unavailable when a direct document URL is unknown. See [migration](../../web/supabase/migrations/015_fix_retrieval_and_status.sql).
- Mobile sign-in lacks a reusable session; interest-profile ownership and service-role-backed public actions require dedicated authorization review. Confirm against the current checkout before implementation.

## Jev and legal classification

Jev is a typed decision/classification model, not a source of legal authority. Evaluate it as an optional triage/category adapter against deterministic rules and the current classifier using reviewed Rwanda-specific EN/RW/FR fixtures. Measure false negatives, precision/recall, calibration, cost, privacy and behavior on mixed-language legal documents. Do not use a score alone to approve a law, decide legal force or bypass human review. [TypeSafe describes its model and output-format limits](https://typesafe.ai/).

## First usable release

Required: server auth/RBAC, source-preserving ingestion/review, exact and lexical retrieval, source reader, deterministic emergency routing, grounded answer/abstention, citation checks and operations visibility. Optional after evaluation: embeddings, Jev, model reranker, multiple providers, agent graphs, visual workflow editor, streaming and offline synchronization. Performance, legal accuracy, corpus completeness and production resilience require actual measurements and reviewer evidence.
