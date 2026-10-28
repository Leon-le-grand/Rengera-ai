# Rengera AI

Rengera AI is a Rwanda-focused legal-literacy product. The web application helps people ask legal questions, inspect indexed laws and citations, and gives authorized administrators tools to ingest and review source material. A Flutter mobile app is in prototype stage; its current implementation is onboarding, login and a navigation shell.

The product explains legal information from retrieved source material. It must show its sources and limits and must not be presented as a guarantee of legal advice or outcome.

## Repository map

```text
web/       Next.js 15 web application, routes/actions, Supabase SQL and scripts
mobile/    Flutter Android/iOS application
docs/      Requirements, architecture, data, design, security, plan and release docs
data/      Local crawled PDFs/manifests when present; gitignored
downloads/ Local design assets; gitignored where configured
```

`server/` does not currently exist. The user-requested V2 target adds a dedicated FastAPI server and migrates the web app to React with TanStack Router and Query. The migration is planned, not implemented; dependencies remain isolated by subproject.

## Start locally

### Web

```bash
cd web
pnpm install
cp ../.env.example .env.local
pnpm dev
```

Configure the environment values required by the workflow in root `.env.example`. Do not commit `.env.local` or real keys.

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

The Flutter UI is a scaffold and is not yet feature-parity with the web product.

## Useful web commands

From `web/`: `pnpm run lint`, `pnpm run typecheck`, `pnpm run verify`, and `pnpm run build`. The checks and their coverage are described in [`docs/08-TEST-STRATEGY.md`](docs/08-TEST-STRATEGY.md).

## Documentation and work queue

- Begin with [`AGENTS.md`](AGENTS.md), [`TASKS.md`](TASKS.md), and [`MEMORY.md`](MEMORY.md).
- [`docs/README.md`](docs/README.md) is the full documentation map.
- [`docs/v2/README.md`](docs/v2/README.md) describes the requested target architecture, UI, migration and reliability review. The older numbered specifications document the current implementation and enduring constraints.
- [`CODEX-TASK-PROMPT.md`](CODEX-TASK-PROMPT.md) starts or resumes an authorized implementation session.

## Product and security boundaries

- All model calls use `web/lib/space-bunny.ts` and environment-selected configuration.
- Supabase service-role credentials are server-only. Public access is read-only; privileged writes require verified authorization.
- Never overwrite `laws.raw_content`; reject invalid AI classifications before storage.
- Preserve exact article text and make source/review state visible.
- Do not run migrations, upload corpus data or deploy to a hosted environment without explicit target-specific authorization.

## Branches

`main` is production and `dev` is integration. Feature work normally starts from `dev` and returns through review. Preserve the active branch and local changes when continuing an existing worktree.
