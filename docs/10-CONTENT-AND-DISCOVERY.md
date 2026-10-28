# 10 — Legal content and discovery

> **Enduring content constraints.** V2 source versioning, classifier evaluation and retrieval plans are in [`v2/03-DATA-INGESTION-AND-RAG.md`](v2/03-DATA-INGESTION-AND-RAG.md).

## Source authority and provenance

- Ingest only legal materials from an identified source; record source URL, source name, instrument identifier, publication/effective dates when known, source filename and retrieval date where schema permits.
- Do not claim official status from a filename or model classification alone. Distinguish source provenance, current statutory status and human review.
- Source law text and extracted article content are the record to inspect. Summaries, tags, obligations, penalties and translations are derivative aids and must not replace the source.
- Keep source and derived metadata separate. Never overwrite `raw_content` with a model response or a normalized summary.
- Preserve exact article wording and preamble. Any normalization must be limited to extraction needs and must not alter substantive language.

## Ingestion and review states

1. Identify and retain the original source artifact where the current workflow supports it.
2. Extract text and record extraction/integrity status; flag unreadable/scanned material rather than treating an empty parse as complete.
3. Parse article boundaries across English, Kinyarwanda and French; preserve mixed-language boundaries and preamble.
4. Run strict classification, validate the complete schema and reject invalid output before storage.
5. Store source, derived fields and article records separately; calculate available hashes/coverage metadata.
6. Keep records visibly awaiting review until an authorized reviewer confirms them. No automatic label may imply legal validation beyond its actual rule.

Current implementation has a web PDF path and Python ingestion/crawl utilities. Which path is canonical for future corpus operations remains a technical decision; do not imply the Python utility is wired into the deployed admin path without evidence.

## Search and answer presentation

- Search should return the closest currently indexed source passages and include enough law/article context for inspection.
- Prefer exact article-level records where available; use whole-law fallback only when clearly marked and useful.
- Filter or label repealed/amended/unknown status according to stored status; never suppress a status caveat to make an answer sound fluent.
- Every legal claim in generated output must be traceable to retrieved context. Citation-verifier failure means abstain or clearly report the limitation.
- Search results and summaries must not imply the database is complete or current unless that has been measured and approved.
- Emergency signals route to configured help before normal retrieval and generation.

## Language and editorial rules

- Current supported answer languages are English (`en`), Kinyarwanda (`rw`) and French (`fr`).
- Keep statutory quotations in their source language and exact wording. A translation or explanation must be labeled as such and remain separate from the quote.
- Do not add Swahili or another language until language quality, corpus availability, UX, and review ownership are approved.
- Use plain-language explanations, but do not smooth over uncertainty, conflicting sources, missing dates or incomplete extraction.

## Discovery and provenance UI

Law cards/readers and chat citations should show available document title/number, source link or PDF, applicable status/date, article number, review state, extraction/integrity warnings and the exact text. Hide fields only when absent; do not invent replacements. Explain missing source or unavailable article states clearly.
