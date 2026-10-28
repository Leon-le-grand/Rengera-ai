# 03 — Data design

> **Current schema baseline.** V2 source versions, transactional ingestion, optional classifiers and retrieval are specified in [`v2/03-DATA-INGESTION-AND-RAG.md`](v2/03-DATA-INGESTION-AND-RAG.md); none is implied to be migrated or deployed.

## Storage boundary

Supabase Postgres and Storage are the shared persistent backend. The local ordered migration set is `web/supabase/migrations/001_...sql` through `016_...sql`. The repository does **not** establish which migrations have been applied to a hosted project; inspect the target environment read-only before any write or migration.

## Main records

| Record | Purpose and source | Integrity/ownership rule |
| --- | --- | --- |
| `legal_categories` | Shared category names used by law metadata | Public listing is read-only; privileged mutation stays server-side |
| `laws` | One legal instrument with source identifiers, `raw_content`, classification metadata, status and provenance fields | `raw_content` is source text and must never be replaced by summaries/classifications |
| `law_articles` | Article/preamble-level exact text, number, citation, and searchable content | Preserve text verbatim; retain preamble; article text must trace to a law/source |
| `app_users` | Citizen account identity and password hash | Password hash only; RLS is restrictive; application session controls ownership |
| `answer_feedback`, `usage_events`, `user_deadlines`, `law_change_alerts` | Product feedback, operational analytics, user deadlines and alerts | User-private records must be filtered to the verified owner; avoid exposing sensitive question text unnecessarily |
| `shared_consultations` | Explicitly shared consultation with expiring token | Only the intended public token view is exposed; respect expiry |
| Storage `legal-pdfs` | Original/source PDF objects referenced by laws | Public reads only where the source is intended to be public; uploads/overwrites require a verified privileged path |

Table/column details are defined by SQL, not this summary. Check migrations 001–016 before altering contracts. Product tables and names should be revalidated against the latest migration before use.

## Source and derived data lifecycle

```text
Official source PDF / text
        │ preserve provenance and bytes/text
        ▼
Extraction ──> exact source text ──> exact article rows
        │                                  │
        └──> strict classification metadata│
                  │                       │
                  └── summaries/translations/retrieval metadata
                                          ▼
                            citizen presentation with source links
```

- Preserve source URL, document identifier, source file name and original PDF reference where available.
- `raw_content` remains distinct from title/category/status/summary/classification fields.
- Store and validate content/PDF hashes and extraction coverage fields where the current schema provides them.
- A parser or classifier must fail closed: invalid schema, unusable extraction or failed integrity guard must not create a trusted record.
- Review state is explicit. An unreviewed law may be presented only with an honest unreviewed label; no UI should infer verification from extraction quality alone.
- Deduplication and replacement behavior must be checked against current transactional code and migrations before changing ingestion.

## Search and derived indexes

The active application uses Supabase/Postgres RPC functions for law and article search; inspect migrations 002–004 and 015. The repository includes a `web/scripts/legal_chunks_schema.sql` experiment for pgvector, but it is not part of migrations 001–016 and is not evidence that vector search is deployed. Embeddings are optional provider configuration. Do not make them a required product dependency without a measured retrieval need and an approved migration.

## Ownership, retention and privacy

- Law documents are intended as publicly readable source material; private account and user-product records need owner scoping.
- Administrator writes require a verified administrator session in the web app plus server-side service-role access.
- Share tokens are bearer links. Expiration and access behavior must remain visible and bounded.
- Retention periods, deletion/export rights, analytics minimization, backup schedule, data residency and incident ownership are **open operational decisions**. Do not invent values or claim compliance.

## Migration rules

1. Add a new ordered migration; never silently edit a migration already applied to any environment.
2. Review table policies, grants, RPC signatures and indexes alongside application callers.
3. Prepare a backup/restore and rollback approach before hosted changes.
4. Apply to a non-production target and inspect data behavior before production.
5. Record actual target, migration range and evidence in the release handoff; never store credentials there.
