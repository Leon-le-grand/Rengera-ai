# Rengera AI

Rengera AI is a Rwanda-focused legal-literacy product. The web application helps people ask legal questions, inspect indexed laws and citations, and gives authorized administrators tools to ingest and review source material. A Flutter mobile app is in prototype stage; its current implementation is onboarding, login and a navigation shell.

The product explains legal information from retrieved source material. It must show its sources and limits and must not be presented as a guarantee of legal advice or outcome.

## Repository map

```text
web/       Legacy Next.js 15 application, routes/actions, Supabase SQL and scripts
platform/  V2 React/Vite app with TanStack Router and Query
server/    V2 Python/FastAPI service and tests
contracts/ Versioned OpenAPI contract generated from the server
mobile/    Flutter Android/iOS application
docs/      Requirements, architecture, data, design, security, plan and release docs
data/      Local crawled PDFs/manifests when present; gitignored
downloads/ Local design assets; gitignored where configured
```

The V2 rebuild is under construction. `web/` stays runnable as the migration baseline until its capabilities are ported and accepted; `platform/` and `server/` own new work. Do not share runtime code or dependencies between them.

## Start locally

### V2 platform

```bash
cd platform
pnpm install
cp .env.example .env.local
pnpm dev
```

### V2 server

```bash
cd server
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

### Legacy web

```bash
cd web
pnpm install
cp ../.env.example .env.local
pnpm dev
```

Configure the environment values required by the workflow. Do not commit `.env`, `.env.local` or real keys.

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

The Flutter UI is a scaffold and is not yet feature-parity with the web product.

## Useful commands

Legacy web, from `web/`: `pnpm run lint`, `pnpm run typecheck`, `pnpm run verify`, and `pnpm run build`. The checks and their coverage are described in [`docs/08-TEST-STRATEGY.md`](docs/08-TEST-STRATEGY.md).

V2 server, from `server/`: `uv run ruff check .`, `uv run pytest -q`, and `uv run python -m scripts.export_openapi --check`.

V2 platform, from `platform/`: `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Documentation and work queue

- Begin with [`AGENTS.md`](AGENTS.md), [`TASKS.md`](TASKS.md), and [`MEMORY.md`](MEMORY.md).
- [`docs/README.md`](docs/README.md) is the full documentation map.
- [`docs/v2/README.md`](docs/v2/README.md) describes the requested target architecture, UI, migration and reliability review. The older numbered specifications document the current implementation and enduring constraints.
- [`CODEX-TASK-PROMPT.md`](CODEX-TASK-PROMPT.md) starts or resumes an authorized implementation session.

## Product and security boundaries

- Legacy web model calls use `web/lib/space-bunny.ts`; the V2 server owns its provider adapter and configuration. Never hardcode a model ID in a feature.
- Supabase service-role credentials are server-only. Public access is read-only; privileged writes require verified authorization.
- Never overwrite `laws.raw_content`; reject invalid AI classifications before storage.
- Preserve exact article text and make source/review state visible.
- Do not run migrations, upload corpus data or deploy to a hosted environment without explicit target-specific authorization.

## Branches

`main` is production and `dev` is integration. Feature work normally starts from `dev` and returns through review. Preserve the active branch and local changes when continuing an existing worktree.
