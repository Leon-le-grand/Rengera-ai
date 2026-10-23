# Rengera AI — MEMORY.md

Last updated: 2026-10-23. Living document — update after every meaningful change.

## Repo layout (post-reorg)

```
Rengera-ai/
├── web/          Next.js 15 app (admin + citizen chat + library + API + migrations)
├── mobile/      Flutter 3.38 app (Android + iOS), offline-first reader
├── server/      (planned) standalone ingest worker + USSD gateway
├── data/        crawled PDFs + manifests (gitignored, re-downloadable)
├── docs/        research, plan, architecture
├── downloads/   logo pack (gitignored)
├── AGENTS.md    agent rules
├── MEMORY.md    this file
└── README.md    parent overview
```

## Branches

- `main` — production. Vercel deploys from here.
- `dev` — integration. All new work lands here first.

## Progress snapshot: ~96%

### Done

- Chat RAG with 10-section answers, article-level deep links, multilingual (EN/RW/FR)
- Small-talk + no-source guards (token saver)
- Law library with reader: sticky tabs, collapsing summary, integrity panel (SHA-256, coverage, PDF flag)
- Admin ingestion: bulk upload (up to 10), drag-and-drop, per-file status, AI Test connection
- Admin review: soft gate + bulk-approve (principal, ≥95% coverage, no OCR flag), shift-click multi-select
- Multilingual summaries (EN/RW/FR) via cached translation
- Notifications: law-change alerts + TasteRank "for you today"
- Deadlines, bookmarks, answer feedback, emergency routing (112/166/3029)
- Accounts (scrypt, HMAC sessions, rate limiting, admin gate)
- USSD webhook at `/api/ussd` (Africa's Talking, Kinyarwanda, RPC-only)
- TasteRank dual-layer recommendation (deterministic + model refine)
- Integrity: content_hash, source_pdf_sha256, coverage %, needs_ocr
- RLRC crawl: 434 laws (955MB) + 20 quarantined non-laws
- Igazeti crawl: 843 gazette issues 2004-2026 (1.9GB)
- Triages: both sources cleaned
- Mobile Flutter scaffold: onboarding, login, app shell, theme parity
- Capacitor Android shell (alternative, still present)
- Logo pack in ~/Downloads

### Migrations run order

001..014 (012-014 added: integrity fields, review gate + OCR flag, summary translations). Plus 015 (retrieval fix) and 016 (shared consultation expiry) from friend's audit.

### Open work

- [ ] Run migrations 012-016 in Supabase (001-011 already run)
- [ ] Upload the 434 RLRC laws via admin (10 per batch)
- [ ] Bulk-approve the safe pile, hand-review the rest
- [ ] Golden KN/EN/FR article-parser tests
- [ ] Prod secrets: AUTH_SECRET, ADMIN_PASSWORD_HASH, real ADMIN_EMAIL
- [ ] Optional embedding model (semantic search)
- [ ] Flutter: chat, library, reader, offline storage, notifications, admin
- [ ] Build APK (Gradle JAVA_COMPILER issue — JDK path fix needed)
- [ ] Igazeti triage (gazette issues bundle non-law content)

### Common issues & fixes

See AGENTS.md. Short list:
- "Server Action not found" → hard-refresh browser
- FreeTierError from OpenCode → use service-account key + paid model
- Empty package.xml in Android SDK → copy from sibling platform
- Gradle "does not provide JAVA_COMPILER" → point at JDK not JRE
- Gradle "Unexpected lock protocol" → delete build-cache-1, retry
- flutter pub get fails offline → needs DNS once
- Scanned PDFs → run --ocr in Python ingester
- bun run verify fails on unused imports → remove them

### Data on disk (gitignored)

- `data/rlrc/pdfs/` — 434 laws, 955MB
- `data/rlrc/quarantine/` — 40 non-laws, 14MB
- `data/igazeti/` — 836 gazette issues, 1.9GB
- Total: ~2.9GB, ~1,300 files