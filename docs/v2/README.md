# Rengera AI V2 documentation

This directory preserves and organizes the user's requested architecture redesign. It is a target and implementation handoff; its presence does not mean V2 is complete, accepted or deployed. The user's explicitly requested direction is React/Vite with TanStack Router and Query, a dedicated Python server, generated OpenAPI clients, staff RBAC, RAG and bounded agent orchestration. Provider choices and numerical capacity/quality targets require validation; hosted changes, spend and deployment require applicable authorization.

**Approved repository layout (2026-10-28):** the V2 frontend is built in `platform/` (React/Vite, with source under `platform/src/`), the V2 backend in `server/` (Python/FastAPI), and versioned contracts under `contracts/`. Legacy `web/` is preserved as the runnable Next.js baseline until its capabilities are ported and accepted; it is not the V2 frontend, and SQL migrations remain under `web/supabase/migrations/` until a recorded ownership move. See [the decision record](../09-DECISIONS-AND-SOURCES.md#approved-v2-repository-layout-2026-10-28).

The original root research files and the existing numbered specifications are preserved as baseline evidence. The current-code inventory is [BASELINE.md](BASELINE.md). The root `TASKS.md` is the sole execution queue; `V2-001` completed the remaining reconciliation before dependent implementation. Do not silently replace existing `getAdminSession()` checks until the new server permission model is implemented and verified.

## Read in order

1. [Current-system baseline](BASELINE.md) — source-backed inventory of the legacy `web/` application as of 2026-10-28.
2. [Product and UI](01-PRODUCT-AND-UI.md) — users, routes, states and design requirements.
3. [System architecture](02-SYSTEM-ARCHITECTURE.md) — modules, dependencies and migration.
4. [Data, ingestion and RAG](03-DATA-INGESTION-AND-RAG.md) — source fidelity, classification and retrieval.
5. [AI and orchestration](04-AI-AND-ORCHESTRATION.md) — model configuration, workflows and tools.
6. [API, auth and RBAC](05-API-AUTH-AND-RBAC.md) — OpenAPI, clients, permission boundaries and CORS.
7. [Operations and failure modes](06-OPERATIONS-AND-FAILURES.md) — deployment, observability and degraded operation.
8. [Architecture review](ARCHITECTURE_REVIEW.md) — simplification decisions, Jev evaluation and known gaps.
9. [Full research](RESEARCH.md) — detailed diagrams, file map, UI and implementation contracts with primary-source links.
10. [Migration plan](PLAN_RESEARCH.md) and the [root task queue](../../TASKS.md) — dependencies, acceptance and checks.

Within this directory, the architecture review's later simplification supersedes earlier speculative vendor and agent-platform choices. Concrete task status and actual checks must be kept in the root queue and memory, not inferred from a plan. Hosted schema, corpus, quality, availability and production deployment remain unverified.
