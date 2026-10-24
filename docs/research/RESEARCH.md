# Rengera AI — RESEARCH.md

> **Project-direction reference, not current-state proof.** This note records the product and algorithm thesis. Some statements about implemented retrieval, safety, review, ingestion and mobile behavior may predate current code. Use `docs/01-PRODUCT-REQUIREMENTS.md` for current scope and verify implementation claims against source and migrations before acting.

## 1. Problem

Rwandan citizens, businesses, and journalists cannot reliably answer "what does the law say about X" because:
- Laws are published in Kinyarwanda/English/French, often only as PDFs.
- No public, searchable, article-level index exists.
- Generic chatbots hallucinate articles and deadlines.
- Urgent safety situations need routing, not analysis.

## 2. Solution thesis

A retrieval system, not a chatbot. Three steps, no fourth step where it invents the law:

1. **Ingest** — official PDF → article-level chunks with citation + gazette ref + hash.
2. **Retrieve** — user question → ranked articles (full text, not fragments) + law status.
3. **Answer** — model writes only from retrieved text, cites every claim, abstains honestly.

Plus a lightweight USSD layer for feature phones, and a per-account taste profile for daily "for you" notifications.

## 3. Algorithms

### 3.1 Article boundary parser (multilingual)

Regex over `Article N`, `Ingingo (ya) N`, `Iteka ya N` — all styles matched regardless of declared language, so trilingual documents keep every boundary. Text before the first heading becomes a `preamble` row (never discarded). Each page tried with plain text, layout text, and tables; richest wins. Coverage = captured chars / source chars; `--min-coverage 99` fails the build below 99%.

### 3.2 Retrieval (websearch_to_tsquery)

Postgres full-text search over `law_articles` (article-level) + `laws` (full text fallback). Repealed laws filtered. Returns full article text + status + citation. Article-first: if any article matches, the whole-law row is suppressed.

### 3.3 Citation verifier (deterministic)

Every `Article N` / `Ingingo ya N` reference in the model's answer is checked against the retrieved set. If >30% are unresolved, the answer is discarded and replaced with an honest abstention. No model involved — pure string matching.

### 3.4 TasteRank (recommendation)

Layer 1 — deterministic: category overlap × recency. A kid's questions build a school-law profile; business law scores zero for them. Layer 2 — model refines order and writes the hook in the reader's language (EN/RW/FR), strict-validated; any failure falls back to layer 1 + template hooks. Hooks are language-aware (template banks per language).

### 3.5 Emergency routing

Word-boundary regex over EN/RW/FR urgent patterns (kill, suicide, assault, rape, detained, arrested, bleeding, attack, emergency, bribe, etc.). On match: skip retrieval and LLM, return structured safety markdown with Police 112 / RIB 166 / Isange 3029.

### 3.6 Classification fidelity

Strict JSON schema with required fields; malformed/incomplete rejected before insert. Fidelity guardrails: fabricated retroactive dates dropped; `principal` never keeps `amends_law_reference`; missing status → active; `"status": "amendment"` normalised to `amended` + `amendment` type; arrays accept null → empty array. AI output fenced as untrusted; identifiers verified against source text.

### 3.7 Integrity

SHA-256 of extracted text (`content_hash`) and of the PDF binary (`source_pdf_sha256`), plus extraction coverage % and per-law `needs_ocr` flag. Dedup on `content_hash` so re-uploads refresh articles instead of duplicating.

### 3.8 Review gate (soft)

Unreviewed laws carry a visible "Not yet reviewed" note; citizens see all, admins see an approval action. Bulk-approve stamps principal laws with ≥95% coverage and no OCR flag. Chat citations show Verified only for reviewed laws.

## 4. Senior-developer decisions

- **Deterministic first, model second.** Recommendations, retrieval scoring, citation verification, emergency routing all work with no model. The model only refines. A dead provider degrades gracefully, never corrupts data.
- **Fidelity over fluency.** Article text sliced verbatim; summaries are metadata, never the source.
- **Fail safe, not silent.** Bad model → nothing stored. Bad retrieval → honest abstention, not a hallucinated answer.
- **Server actions are the only write path.** Service-role key never reaches the browser; every write checks the admin session.
- **Public access is read-only.** RLS with no anon write policies.
- **One model env var.** `SPACE_BUNNY_MODEL` drives classification, answers, and translations; switching models needs zero code change. Optional fallback provider for resilience.
- **No Kiswahili.** Only EN/RW/FR — the three official languages. Swahili caused hallucinated translations.
- **USSD is RPC-only.** No LLM in the USSD loop (too slow); pre-generated excerpts, 90-char trims, emergency contacts first.

## 5. Mobile strategy

Flutter (not Capacitor) for true offline-first: real local SQLite via drift, per-law download, offline search (MiniSearch), sync outbox for writes. Dark-first theme mirroring the web palette exactly. Onboarding → login → app shell. Same backend (Supabase + OpenCode inference).

## 6. Open work

Golden KN/EN/FR parser tests; prod secrets; optional embedding model; Flutter feature screens; APK build (Gradle JDK path); Igazeti triage.
