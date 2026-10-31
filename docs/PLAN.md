# 07 — Implementation plan

> **Baseline milestones.** For the requested V2 migration use [`v2/PLAN_RESEARCH.md`](v2/PLAN_RESEARCH.md) and the root `TASKS.md` queue. The milestones below retain current product and safety acceptance context; V2 is under construction in `platform/` and `server/`, not shipped.

This plan defines milestone outcomes and gates. `TASKS.md` selects the next concrete slice and is the current execution queue. Dates are intentionally omitted until scope, owners and external dependencies are known.

## M0 — Reconcile foundation and set redesign acceptance

**Outcome:** reliable documentation, a clear source-backed view of current behavior, and an ordered work queue.

**Gate:** current docs link to existing files and commands; user worktree is preserved; proposed work is distinguished from shipped behavior; no feature is called done solely from a plan.

## M1 — Redesign the citizen web experience

**Outcome:** a responsive citizen path from question to grounded answer, source/article inspection, honest abstention and urgent help.

**Sequence:** workspace/chat entry → library and article reader → refine navigation, language and secondary features.

**Gate:** existing data/auth contracts remain enforced; source, review and legal status are legible; responsive and accessibility checks pass; no unsupported corpus/accuracy claims.

## M2 — Harden ingestion and content trust

**Outcome:** reliable source intake, article fidelity, strict classification, explicit review and traceable corpus status.

**Gate:** parser and classification checks cover EN/RW/FR; source text remains immutable; invalid outputs persist nothing; reviewer and hosted schema/data workflows are authorized and evidenced.

## M3 — Deliver a useful Flutter citizen slice

**Outcome:** native auth, chat, library and cited article reading with a specifically agreed offline boundary.

**Prerequisite:** approve mobile API/data access, session renewal, offline read/write, sync conflict and supported release scope.

**Gate:** no credentials are bundled; client contracts are documented; analysis/tests/build and device-level checks are recorded.

## M4 — Prepare operations and public release

**Outcome:** verified corpus, operational owner, release/restore procedure, privacy and counsel review, support and monitoring plan.

**Gate:** launch metrics and risk owners exist; target Supabase migration state is reconciled; backups/restore are proven; no release claim relies on local-only verification.

## M5 — Build the approved V2 platform in reviewed slices

The approved V2 layout is a new React/Vite frontend in `platform/`, a dedicated FastAPI backend in `server/`, and versioned contracts in `contracts/`; `web/` stays runnable until each capability is ported and accepted. The user requested a dedicated API and ingestion worker, generated clients, staff RBAC, RAG and bounded workflows. Select operational implementations with a migration plan and measurements. Semantic retrieval remains evaluation-gated; push delivery and billing remain outside the approved direction.

## Current advancement

M0 documentation foundation is complete, including the V2 baseline inventory and approved-layout reconciliation. `V2-003` and later implementation slices are the active queue in `TASKS.md`. `WEB-001` is handed off as blocked on its unrun rendered review; its accepted work remains in `web/` and migrates through `V2-013`. Data operations and mobile features retain their external/architecture prerequisites; they do not block independent V2 build work.
