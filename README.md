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

Run these files in the Supabase SQL Editor:

```text
supabase/migrations/001_create_legal_knowledge_base.sql
scripts/legal_chunks_schema.sql
```

Never commit `.env.local`, the Space Bunny key, or the Supabase service-role key.

### Administrator access

Prototype defaults:

```text
ADMIN_EMAIL=admin
ADMIN_PASSWORD=admin123
```

Replace them before deployment. Generate a production hash with:

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
6. Review the strict JSON and recently stored laws.

The article indexer remains available for article-level retrieval.

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

## Verification checklist

### Space Bunny

- Confirm a legal question returns a structured, cited answer.
- Confirm an emergency scenario routes to official contacts.
- Remove the API key temporarily and confirm a clear configuration error.
- Confirm the key never appears in client-side JavaScript.

### Classification

- Paste a known law and compare every returned field with the source.
- Upload a digital-text PDF and confirm the title and reference number appear in it.
- Record scanned PDFs as unsupported until OCR is added.
- Introduce malformed input and confirm nothing is stored.

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
app/admin-actions.ts              # Article indexing and embeddings
app/auth-actions.ts               # Administrator session actions
app/legal-actions.ts              # Supabase classification and queries
lib/space-bunny.ts                # OpenAI-compatible Space Bunny client
lib/legal-classification.ts       # Strict JSON schema and parser
lib/supabase.ts                   # Server-only Supabase clients
lib/legal-pdf.ts                  # PDF extraction and article splitting
scripts/ingest_legal_pdf.py       # Strict-fidelity Python parser
supabase/migrations/              # Supabase knowledge-base schema
```
