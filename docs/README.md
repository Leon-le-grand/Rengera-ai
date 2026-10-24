# Rengera AI documentation map

This documentation separates approved product constraints, current implementation evidence, recommendations, and open decisions. Use the labels below when a statement could be mistaken for an approval.

- **Current** — checked in repository code/configuration on 2026-10-24.
- **Approved** — explicit user or repository invariant; changes require reconciliation.
- **Proposed** — a recommended direction for the redesign; it does not authorize unrelated scope.
- **Open** — the repository does not provide the decision or evidence needed.

## Read in this order

1. [`AGENTS.md`](../AGENTS.md) — enduring rules and safety boundaries.
2. [`TASKS.md`](../TASKS.md) — current task priority and dependencies.
3. [`MEMORY.md`](../MEMORY.md) — current checkpoint and known environment context.
4. Read the product, architecture, data, interface, design, security and release specifications relevant to the task.
5. Confirm every current-state claim against the implementation and current git state.

## Specifications

| File | Purpose |
| --- | --- |
| [01 Product requirements](01-PRODUCT-REQUIREMENTS.md) | Product outcome, users, scope, non-goals, acceptance outcomes, open product inputs |
| [02 System architecture](02-SYSTEM-ARCHITECTURE.md) | Existing components, boundaries, data flows, and proposed evolution |
| [03 Data design](03-DATA-DESIGN.md) | Tables, source/derived data separation, lifecycle and migration facts |
| [04 Interfaces and contracts](04-INTERFACES-AND-CONTRACTS.md) | Server actions, routes, mobile integration boundary, error behavior |
| [05 Design system](05-DESIGN-SYSTEM.md) | Brand tokens, redesign principles, responsive and accessibility requirements |
| [06 Security and operations](06-SECURITY-OPERATIONS.md) | Trust boundaries, secrets, access, operational gates and unresolved risks |
| [07 Implementation plan](PLAN.md) | Milestones and advancement gates |
| [08 Test strategy](08-TEST-STRATEGY.md) | Risk-based checks and existing verification commands |
| [09 Decisions and sources](09-DECISIONS-AND-SOURCES.md) | Approved constraints, proposals, evidence inventory and open choices |
| [10 Content and discovery](10-CONTENT-AND-DISCOVERY.md) | Legal-source provenance, fidelity, review, language and retrieval rules |
| [11 Release handoff](11-RELEASE-HANDOFF.md) | Local setup, configuration, migrations, deployment and rollback cautions |

## Product references

- [`docs/research/RESEARCH.md`](research/RESEARCH.md) is a concise product and algorithm brief. Use it as historical context, not as proof that a feature is currently deployed.
- [`docs/research/rengera-system-research.md`](research/rengera-system-research.md) is a large architecture/security audit dated 2026-10-20. Its findings and status claims are a dated snapshot; re-check cited code before action. It contains proposals that are not automatically approved.
- [`docs/mobile/ARCHITECTURE.md`](mobile/ARCHITECTURE.md) describes the Flutter implementation boundary and mobile direction.
- [`docs/android/README.md`](android/README.md) is retained only as a redirect; its former Capacitor build instructions are superseded.

## Conflict resolution

Explicit current user decisions and platform instructions take precedence. Within project docs, approved decision records and product requirements govern scope; `AGENTS.md` governs durable operating rules; `PLAN.md` sequences approved milestones; `TASKS.md` selects current work; `MEMORY.md` is supporting context and cannot authorize scope. Code establishes what is implemented, not what is approved. When a change affects more than one owner document, update them together and label superseded guidance.
