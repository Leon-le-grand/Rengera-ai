# Rengera AI — active work queue

Update this queue when a task starts or closes. Keep one `DOING` task for this working agent.

## Active

- [x] `DOC-001` · DONE — Establish the source-backed project documentation system and reconcile stale entry points.
  - After: none.
  - Spec: `docs/README.md`, `docs/01-PRODUCT-REQUIREMENTS.md`–`docs/11-RELEASE-HANDOFF.md`.
  - Done when: README, operating rules, queue, memory, session prompt, architecture/product specifications and subproject guides agree with inspected repository state; stale Android guide is clearly superseded.
  - Evidence: inspected manifests, routes/actions and migrations on 2026-10-24; all 30 local Markdown links resolve; web typecheck, `verify`, build and Python ingestion checks pass. ESLint was not verified after config repair; see `docs/08-TEST-STRATEGY.md`.

## Ready after DOC-001

- [ ] `WEB-001` · NEXT — Redesign the citizen web workspace entry and chat surface around a clear question → grounded answer → source path.
  - After: `DOC-001`.
  - Spec: `docs/01-PRODUCT-REQUIREMENTS.md` (redesign outcomes), `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/05-DESIGN-SYSTEM.md`.
  - Done when: the public workspace makes language choice, question entry, source links, law/review status, abstention, and urgent help clear on desktop and mobile while preserving existing auth/data contracts and brand tokens.
  - Verify: applicable `pnpm --dir web run lint`, `typecheck`, `verify`, and `build`; review responsive, keyboard, focus, and screen-reader behavior.

- [ ] `WEB-002` · TODO — Redesign the law library and article reader as the source-verification companion to chat.
  - After: `WEB-001`.
  - Spec: `docs/03-DATA-DESIGN.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/05-DESIGN-SYSTEM.md`, `docs/10-CONTENT-AND-DISCOVERY.md`.
  - Done when: a reader can search/navigate the currently indexed laws, inspect exact article text and provenance, and distinguish review/status/integrity states without fabricated completeness claims.
  - Verify: web lint/typecheck/build plus article deep-link, empty/error, responsive, and keyboard checks.

- [ ] `WEB-003` · TODO — Audit and complete the administrator ingestion/review flow against source-fidelity and approval invariants.
  - After: `WEB-001`.
  - Spec: `docs/03-DATA-DESIGN.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/06-SECURITY-OPERATIONS.md`, `docs/10-CONTENT-AND-DISCOVERY.md`.
  - Done when: upload/classify/review states are explicit, schema failures store nothing, source text remains unchanged, and privileged mutations enforce a verified admin session.
  - Verify: parser/route verification scripts and applicable manual security/error-state checks. Hosted writes are a separate approval gate.

- [ ] `MOB-001` · TODO — Repair and document the Flutter authentication/session contract before expanding mobile features.
  - After: `WEB-001` and an approved mobile API/auth decision.
  - Spec: `docs/02-SYSTEM-ARCHITECTURE.md`, `docs/04-INTERFACES-AND-CONTRACTS.md`, `docs/06-SECURITY-OPERATIONS.md`, `docs/mobile/ARCHITECTURE.md`.
  - Done when: successful sign-in creates a session Flutter can safely reuse, session expiry/logout are handled, and no password/token is persisted insecurely or exposed in logs.
  - Verify: route/client contract checks, `flutter analyze`, meaningful Flutter auth tests, and cookie/token lifecycle checks against a controlled environment.

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

## Parked / decision required

- `DEC-001` — Confirm launch boundary, corpus completeness target, reviewer capacity, supported channels, privacy/retention owner, and legal review requirements. The current product brief does not answer these.
- `DEC-002` — Resolve the current mobile auth mismatch (Next sets an HTTP-only cookie; Flutter does not retain a cookie/token) and choose the API boundary; document session, offline sync and conflict semantics before mobile feature work.
- `DEC-003` — Decide if/when to extract an ingestion worker or standalone service using measured load and reliability needs. No `server/` project is approved or present today.

## Completed

- `DOC-001` — Source-backed documentation system and stale guide reconciliation. This completes documentation setup only; it does not complete product redesign or implementation.
