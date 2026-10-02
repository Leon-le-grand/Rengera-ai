# RENGERA AI

RENGERA AI is a legal-literacy and RAG platform for Rwanda. It answers legal questions in plain language, retrieves relevant official articles, cites source laws, routes urgent cases to official services, and lets authorized administrators classify and store new legal documents.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and Motion
- Space Bunny through an OpenAI-compatible API
- Supabase Postgres and RLS
- pgvector-ready article storage
- `pdf-parse` for article indexing
- `pdfplumber` for strict-fidelity Python ingestion

## RAG architecture

```text
[Official Legal PDF]
        |
        +--> [PDF text extraction]
                     |
                     +--> [Article / Ingingo boundary parsing]
                                     |
                                     +--> [Metadata + embeddings]
                                                  |
                                                  +--> [Retrieval]
                                                            |
                                                   [Space Bunny answer]
```

Supabase classification follows a separate metadata flow:

```text
[Raw law text or PDF]
        |
        +--> [Space Bunny strict JSON classification]
                     |
                     +--> [Schema validation]
                     |
                     +--> [Category upsert]
                     |
                     +--> [Law + raw_content stored in Supabase]
```

## RAG architecture guarantees

These are the important guarantees of the current design:

1. **AI classification is stored as separate metadata.** Title, category, obligations, penalties, applicable entities, subcategories, and tags are stored in dedicated fields and never replace the law text.
2. **The extracted source text is stored separately in `raw_content`.** The complete extracted text is preserved on the law record.
3. **Classification does not overwrite or modify the law text.** `app/legal-actions.ts` inserts metadata and source content as separate fields.
4. **Malformed or incomplete AI JSON is rejected.** The document is not inserted when Space Bunny omits required fields, returns invalid JSON, or returns an unexpected schema.
5. **Writes require a verified administrator session.** The server action checks the signed administrator session before using the Supabase service-role client.
6. **The service-role key is server-only.** It must never use a `NEXT_PUBLIC_` name or reach the browser.
7. **Public access is read-only.** The migration grants public `SELECT` access but no anon or authenticated insert/update policies.

These guarantees protect data separation and storage integrity. They do not prove that every AI-generated statement is legally correct.

## Known limitations

Be explicit about these limitations:

- The original PDF binary is not yet stored as an immutable source file.
- PDF extraction can lose layout, page numbers, tables, stamps, marginal notes, and graphics.
- Whitespace and repeated blank lines are normalized during extraction.
- Scanned or image-only PDFs are not yet passed through OCR.
- A failed page is not yet blocked automatically in the classification flow.
- Article coverage is not yet checked against every heading in the source.
- AI categories, summaries, obligations, and penalties can still omit or misinterpret topics.
- Classifications are not yet marked as reviewed by a human lawyer.

Before treating the platform as legally authoritative, add:

1. Immutable original-PDF storage in Supabase Storage.
2. SHA-256 hashes for the original PDF and extracted text.
3. Per-page extraction status and failed-page reporting.
4. Article-boundary coverage checks.
5. A `needs_review` state with human approval.
6. Golden-file tests for known Kinyarwanda, English, and French laws.

## Setup

### Install

```bash
bun install
cp .env.example .env.local
bun dev
```

### Space Bunny

```text
SPACE_BUNNY_API_KEY=your-space-bunny-key
SPACE_BUNNY_API_URL=https://api.aimlapi.com/v1
SPACE_BUNNY_MODEL=stealth/space-bunny-alpha
SPACE_BUNNY_EMBEDDING_MODEL=
```

`SPACE_BUNNY_EMBEDDING_MODEL` is optional. Without it, chat works but semantic article retrieval is skipped.

### Supabase

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

Run these files in the Supabase SQL Editor, in order:

```text
supabase/migrations/001_create_legal_knowledge_base.sql
supabase/migrations/002_add_classification_metadata_and_search.sql
supabase/migrations/003_improve_search_and_deduplicate.sql
supabase/migrations/004_add_article_level_search.sql
supabase/migrations/005_add_legal_status_audit.sql
supabase/migrations/006_add_amendment_audit_trail.sql
supabase/migrations/007_create_app_users.sql
```

Migration 003 broadens natural-language search and removes duplicate uploads using a SHA-256 `content_hash`. Migration 004 stores exact article-level text, article numbers, citations, and article-first search results. Migration 005 adds statutory status and amendment/repeal audit fields. Migration 006 adds the document `type`, `amends_law_reference`, `repealed_articles`, `inserted_articles`, `retroactive_effective_date`, and `languages_available`. Migration 007 creates the citizen `app_users` table. Later uploads of the same source text update the existing law and refresh its articles instead of creating duplicates.

`scripts/legal_chunks_schema.sql` is optional and only needed for a separate pgvector article-chunk table.

Never commit `.env.local`, the Space Bunny key, or the Supabase service-role key.

## Legal extraction schema

The classifier in `lib/legal-classification.ts` is versioned by
`CLASSIFICATION_PROMPT_VERSION` and returns strict JSON. Alongside the original
metadata it now records the amendment audit trail:

```text
type                        principal | amendment
amends_law_reference        law amended by this document, or null
superseded_by               law that amended or repealed this document
affected_articles           every article touched in any way
repealed_articles           articles expressly repealed or deleted
inserted_articles           articles expressly inserted or substituted
retroactive_effective_date  { "Article 5": "2023-01-01" } from the source only
languages_available         official languages, defaults to kinyarwanda/english/french
```

Fidelity guardrails enforced in the parser:

1. A fabricated or impossible retroactive date is **dropped**, never stored.
2. A `principal` law never keeps an `amends_law_reference`.
3. A missing `status` falls back to `active`; an explicitly invalid value is rejected.
4. `"status": "amendment"` is normalised to `amended` + `amendment` type, because models routinely confuse the two.
5. Every array accepts `null` and is stored as an empty array.

Run `bun run scripts/verify-classification-parser.ts` to confirm all five.

## Accounts

Sign-in and sign-up are handled by `app/auth-actions.ts` and backed by the
Supabase `app_users` table from migration 007.

- **Sign up** stores name, email, and a scrypt password hash. Plaintext is never persisted.
- **Sign in** resolves the environment administrator first, then falls back to `app_users`.
- Sessions are HMAC-signed, HTTP-only, `sameSite=lax`, and expire after 8 hours.
- `app_users` has RLS enabled with **no policies**, so anon and authenticated clients cannot read it at all.
- Rate limits: 5 sign-in attempts and 3 sign-up attempts per IP per 15 minutes.
- A sign-up cannot claim the administrator email.

The public legal assistant stays reachable without an account; only the admin workspace is gated.

### Administrator access

#### How the administrator signs in

1. Open the app and select **Get Started**.
2. Stay on the **Sign in** tab. Do not use **Create account**.
3. Enter the administrator credentials and submit.
4. The sidebar gains an **Administrator / Law Ingestion** section. That section is the only route to the PDF classifier, and the server rejects any ingestion request without a valid administrator session.

The public legal assistant needs no account. Citizens who create an account get a
signed-in session but never see the administration tools.

#### Prototype defaults

```text
ADMIN_EMAIL=admin
ADMIN_PASSWORD=admin123
```

The Sign in form is prefilled with these so you can test immediately. Replace
them before deployment. Generate a production hash with:

```bash
ADMIN_PASSWORD='use-a-strong-password' npm run auth:hash
```

Set the printed value as `ADMIN_PASSWORD_HASH`, configure a long random `AUTH_SECRET`, and redeploy.

## Administrator workflow

1. Select **Get Started** on the landing page.
2. Sign in with the configured administrator credentials.
3. Open the administration workspace.
4. Paste raw legal text or upload a legal PDF.
5. Select **Classify and store in Supabase**.
6. Review the strict JSON, including the amendment audit trail, and recently stored laws.

The old manual local indexer has been removed because Vercel cannot persist `data/db.json`. Supabase full-text search is the production retrieval path.

## Chat sessions

The chat keeps the current conversation in `localStorage` under `rengera_ai_chat_session_v1`, so a refresh or an accidental tab close does not lose your history. **New chat** clears the thread and returns to the opening message.

## Strict-fidelity Python ingestion

```bash
pip install -r scripts/requirements-legal-ingest.txt

python3 scripts/ingest_legal_pdf.py ./law.pdf \
  --law-id law_labour_66_2018 \
  --document-title "Law N° 66/2018 Regulating Labour in Rwanda" \
  --category "Labour Law" \
  --language kinyarwanda \
  --output ./data/labour_chunks.json
```

The parser splits only at English/French `Article N` and Kinyarwanda `Ingingo ya N` headings, preserves article text, logs unreadable pages, and generates SHA-256 `content_hash` values.

## RLRC document crawler

The crawler discovers the RLRC site tree, honors `robots.txt`, rate-limits requests, and downloads public legal PDFs without bypassing access controls.

```bash
pip install -r scripts/requirements-legal-ingest.txt

python3 scripts/crawl_rlrc_laws.py \
  --start-url https://www.rlrc.gov.rw/ \
  --output ./data/rlrc \
  --max-pages 2000 \
  --max-depth 6
```

Outputs:

```text
data/rlrc/tree.md       # Human-readable discovered hierarchy
data/rlrc/tree.json     # Machine-readable hierarchy
data/rlrc/manifest.json # URL, category path, hash, and local PDF path
data/rlrc/pdfs/         # Downloaded public legal PDFs
```

The crawler is intentionally conservative. Review the discovered tree and provide more specific `--start-url` seeds or `--include-regex` values when you want to restrict it to a particular RLRC category.

## Verification checklist

### Space Bunny

- Confirm a legal question returns a structured, cited answer.
- Confirm an emergency scenario routes to official contacts.
- Remove the API key temporarily and confirm a clear configuration error.
- Confirm the key never appears in client-side JavaScript.

### Classification

- Paste a known law and compare every returned field with the source.
- Confirm status, superseded_by, and affected_articles are explicit and never guessed.
- Confirm an amendment records `type`, `amends_law_reference`, `repealed_articles`, and `inserted_articles`.
- Confirm `retroactive_effective_date` is empty unless the source states a date.
- Confirm `languages_available` defaults to the three official languages.
- Upload a digital-text PDF and confirm the title and reference number appear in it.
- Record scanned PDFs as unsupported until OCR is added.
- Introduce malformed input and confirm nothing is stored.

### Accounts

- Create an account and confirm you are signed in without admin tools.
- Sign out and confirm the sidebar returns to public access.
- Sign in with `admin` / `admin123` and confirm the admin workspace unlocks.
- Confirm a citizen session never reveals the administration workspace.
- Confirm the admin email cannot be registered through sign-up.
- Confirm the stored `app_users.password_hash` starts with `scrypt$`.

### Supabase

- Confirm the category is created once and reused.
- Confirm `raw_content` contains the complete extracted source.
- Confirm metadata did not overwrite `raw_content`.
- Confirm anonymous users can read but cannot insert or update.
- Confirm writes require the custom administrator session.

### Article ingestion

- Test English, Kinyarwanda, and French samples.
- Confirm every article starts at the correct heading.
- Confirm every `content_hash` is 64 hexadecimal characters.
- Confirm article content was not paraphrased.

## Commands

```bash
bun dev
bun run build
bun run start
bun run lint
npm run auth:hash
```

## Key files

```text
app/actions.ts                    # Public RAG chat and retrieval
app/auth-actions.ts               # Sign-in, sign-up, and session actions
app/legal-actions.ts              # Supabase classification and queries
lib/auth.ts                       # scrypt hashing and signed session cookies
lib/space-bunny.ts                # OpenAI-compatible Space Bunny client
lib/legal-classification.ts       # Strict JSON schema and parser
lib/legal-article-parser.ts       # Exact multilingual article extraction
lib/supabase.ts                   # Server-only Supabase clients
lib/supabase-retrieval.ts         # Article-first ranked Supabase context
lib/legal-pdf.ts                  # PDF extraction and article splitting
components/app/LoginScreen.tsx    # Sign-in and sign-up interface
components/app/ChatInterface.tsx  # Chat thread, local session, and new chat
components/app/Sidebar.tsx        # Navigation and account state
scripts/ingest_legal_pdf.py       # Strict-fidelity Python parser
scripts/crawl_rlrc_laws.py        # RLRC tree crawler and PDF downloader
scripts/verify-classification-parser.ts  # Schema fidelity checks
supabase/migrations/              # Supabase knowledge-base schema
```
