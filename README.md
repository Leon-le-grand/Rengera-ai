# Rengera AI — parent project

Monorepo layout:

- `web/` — Next.js 15 app (citizen chat, law library, admin console, API routes, Supabase migrations). Deployed to Vercel.
- `mobile/` — Flutter app (Android + iOS), offline-first citizen reader.
- `server/` — (planned) standalone ingest worker + USSD gateway.
- `data/` — crawled PDFs + manifests (gitignored, re-downloadable).
- `docs/` — research, plan, architecture.
- `downloads/` — logo pack (gitignored).

## Quick start

Web: `cd web && bun install && bun dev`
Mobile: `cd mobile && flutter pub get && flutter run`
Igazeti crawl: `python3 scripts/download_igazeti_gazettes.py` (run from web/)
RLRC crawl: `python3 scripts/crawl_rlrc_laws.py` (run from web/)

## Branches

- `main` — production, always deployable.
- `dev` — integration; all new work lands here first.