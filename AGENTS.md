# Rengera AI — AGENTS.md

Rules for any agent (human or AI) working in this repository. Read this first.

## Architecture

- Parent project with three subprojects: `web/`, `mobile/`, `server/`. Never mix their dependencies.
- Web is Next.js 15 App Router + React 19 + TypeScript + Tailwind 4. Mobile is Flutter 3.38. Data lives in Supabase (Postgres + pgvector + Storage).
- All AI calls go through `web/lib/space-bunny.ts`. Never hard-code a model ID — read `SPACE_BUNNY_MODEL` / `SPACE_BUNNY_API_URL` / `SPACE_BUNNY_API_KEY`. The model must be switchable by env var with zero code change.

## Hard rules

1. **Never commit secrets.** `.env*` is gitignored; only `.env.example` is tracked. Keys live in Vercel env vars and `.env.local`.
2. **Never overwrite `raw_content`.** Metadata and source text are separate columns and stay separate.
3. **Never store an AI classification that fails schema validation.** Throw, don't insert.
4. **Service-role key is server-only.** No `NEXT_PUBLIC_` prefix, ever.
5. **Public access is read-only.** No anon write policies.
6. **Admin writes require a verified session.** Every server action checks `getAdminSession()` first.
7. **Deterministic first, model second.** TasteRank, retrieval scoring, and the citation verifier must work with no model. The model only refines.
8. **Fidelity over fluency.** Article text is sliced verbatim; never paraphrase at ingest.
9. **Fail safe, not silent.** A bad model returns nothing stored, never corrupt data.
10. **Keep the design system.** Dark canvas `#09090b`, gold `#d8b485`, 3px radius. Mobile mirrors web exactly via `RengeraColors`.

## Branch workflow

- `main` = production, always deployable. Vercel deploys from here.
- `dev` = integration. All new work lands here first.
- Feature branches off `dev`, merged back via PR.
- Never force-push `main`.

## Common issues & fixes

- **"Server Action not found"** — stale client tab after a deploy. Hard-refresh.
- **`FreeTierError` from OpenCode inference** — free models only answer inside OpenCode. Use a service-account key + paid model.
- **Empty `package.xml` in Android SDK** — copy from a sibling platform version.
- **Gradle "does not provide JAVA_COMPILER"** — point at a JDK (not JRE) path; set `org.gradle.java.home` in `android/gradle.properties`.
- **Gradle "Unexpected lock protocol"** — delete `~/.gradle/caches/build-cache-1` and retry.
- **`flutter pub get` fails offline** — needs DNS once to resolve advisories; run with hotspot on, then builds are offline.
- **Scanned PDFs** — `extractPdfText` throws `ScannedPdfError`; run `--ocr` in the Python ingester.
- **`bun run verify` fails on unused imports** — remove them; CI must stay green.

## Memory

Progress, feature status and open work live in `MEMORY.md`. Update it after every meaningful change.