# Rengera AI V2 documentation

This directory preserves and organizes the user's requested architecture redesign. It is a target and implementation handoff, not evidence that V2 exists or is deployed. The user's explicitly requested direction is React/Vite with TanStack Router and Query, a dedicated Python server, generated OpenAPI clients, staff RBAC, RAG and bounded agent orchestration. Provider choices and numerical capacity/quality targets require validation; hosted changes, spend and deployment require applicable authorization.

The original root research files and the existing numbered specifications are preserved as baseline evidence. The root `TASKS.md` is the sole execution queue; `V2-001` completes any remaining reconciliation before dependent implementation. Do not silently replace existing `getAdminSession()` checks until the new server permission model is implemented and verified.

## Read in order

1. [Product and UI](01-PRODUCT-AND-UI.md) — users, routes, states and design requirements.
2. [System architecture](02-SYSTEM-ARCHITECTURE.md) — modules, dependencies and migration.
3. [Data, ingestion and RAG](03-DATA-INGESTION-AND-RAG.md) — source fidelity, classification and retrieval.
4. [AI and orchestration](04-AI-AND-ORCHESTRATION.md) — model configuration, workflows and tools.
5. [API, auth and RBAC](05-API-AUTH-AND-RBAC.md) — OpenAPI, clients, permission boundaries and CORS.
6. [Operations and failure modes](06-OPERATIONS-AND-FAILURES.md) — deployment, observability and degraded operation.
7. [Architecture review](ARCHITECTURE_REVIEW.md) — simplification decisions, Jev evaluation and known gaps.
8. [Full research](RESEARCH.md) — detailed diagrams, file map, UI and implementation contracts with primary-source links.
9. [Migration plan](PLAN_RESEARCH.md) and the [root task queue](../../TASKS.md) — dependencies, acceptance and checks.

Within this directory, the architecture review's later simplification supersedes earlier speculative vendor and agent-platform choices. Concrete task status and actual checks must be kept in the root queue and memory, not inferred from a plan. Hosted schema, corpus, quality, availability and production deployment remain unverified.
