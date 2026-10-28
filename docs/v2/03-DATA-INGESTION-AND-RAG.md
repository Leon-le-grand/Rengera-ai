# V2 data, ingestion and RAG

## Source fidelity

Keep original PDF bytes and hash, source origin, normalized extracted text, article/preamble order, page mappings when available, OCR provenance and hashes separate from classification, summaries, translations and embeddings. Never overwrite `laws.raw_content` with generated content. Unknown status or language availability remains unknown; classification review is not legal review. Source versions are staged and published atomically with their article set and index pointer; document-storage uploads require orphan reconciliation.

## Ingestion

```text
Source → validate and hash → extract/OCR → preserve text and parse articles
       → validate coverage and source spans → suggest metadata and categories
       → human review → atomic publication → derived search indexing
```

Use idempotent durable jobs, persistent states and bounded retry. A failed classifier or worker leaves the last published version intact. Staff can create and edit drafts; an authorized admin publishes. Store evidence spans for factual metadata. OCR is a derived transcription, and character coverage of extracted text does not prove full PDF/OCR fidelity.

## Classification decision

Use deterministic extraction and schema validation first; use a model for optional category/metadata suggestions, with reviewer correction. Treat law status, effective dates, repeal and amendments as evidence-backed high-risk fields. Jev is a candidate for low-risk triage and multi-label suggestions, not a required dependency or publication authority. Benchmark Jev, the existing model classifier and rules on reviewer-labelled English, Kinyarwanda, French and mixed-language documents; compare per-class precision/recall, false negatives, calibration, abstention, cost and privacy before adopting. [TypeSafe describes Jev as a typed decision model](https://typesafe.ai/); its format guarantee does not establish factual correctness.

## Retrieval and answering

Start with exact law/article references and Postgres lexical search. Filter eligible versions and show law status honestly; retrieve amendment context. A server-built evidence package binds each passage to a law, source version and article. The model returns claims with evidence IDs; the server validates IDs, article/version pairing, URLs and output shape. Validation of a citation does not by itself prove the claim. Missing evidence leads to abstention; a search outage is an error, not an empty corpus. The server fetches article content by ID rather than trusting client-provided text as official source.

Introduce multilingual embeddings/pgvector, fusion and reranking only after an evaluation demonstrates improvement over the lexical baseline. Version embedding model, dimensions, source hash and chunking; backfill separately and retain lexical fallback and rollback. See the [full RAG specification](RESEARCH.md#rag-implementation-specification).
