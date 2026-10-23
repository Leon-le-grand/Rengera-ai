# Rengera AI — PLAN.md

## Phase 0 — Foundation (done)
- [x] Supabase schema 001-016
- [x] Auth (scrypt, HMAC sessions, rate limiting)
- [x] Chat RAG with citations
- [x] Law library + reader
- [x] Admin ingestion + review gate
- [x] USSD webhook
- [x] TasteRank notifications
- [x] Mobile Flutter scaffold
- [x] Repo reorganization (web/, mobile/, server/, docs/)

## Phase 1 — Data (next)
- [ ] Run migrations 012-016 in Supabase
- [ ] Upload 434 RLRC laws (10 per batch)
- [ ] Bulk-approve safe pile, hand-review rest
- [ ] Triage Igazeti (836 issues → keep laws only)
- [ ] Ingest curated gazette laws

## Phase 2 — Quality
- [ ] Golden KN/EN/FR article-parser tests
- [ ] Prod secrets (AUTH_SECRET, ADMIN_PASSWORD_HASH, ADMIN_EMAIL)
- [ ] Optional embedding model for semantic search
- [ ] Verify citation verifier in production

## Phase 3 — Mobile (Flutter)
- [ ] Chat screen (full RAG answer, citations)
- [ ] Library + reader (offline download)
- [ ] Notifications (alerts + TasteRank)
- [ ] Deadlines, bookmarks, feedback
- [ ] Admin view (ingest + review)
- [ ] Settings (language, theme, account)
- [ ] Offline storage (drift) + sync outbox
- [ ] Build APK + IPA

## Phase 4 — Scale
- [ ] Per-page OCR + coverage block
- [ ] Server-side bulk ingest (overnight, logged)
- [ ] Push notifications (web-push + FCM)
- [ ] Golden-file CI gate