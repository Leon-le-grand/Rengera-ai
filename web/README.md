# Rengera AI web application

Next.js 15 App Router application for the citizen legal-information experience, administrator workflows, share pages and USSD/mobile route handlers. Dependency installation is isolated in this directory; the repository currently uses pnpm.

## Local development

```bash
pnpm install
cp ../.env.example .env.local
pnpm dev
```

Common commands: `pnpm run lint`, `pnpm run typecheck`, `pnpm run verify`, and `pnpm run build`. See the root [verification strategy](../docs/08-TEST-STRATEGY.md).

## Important boundaries

- `app/` owns Next.js routes, pages and server actions.
- `components/` owns client-facing presentation; UI visibility does not grant access.
- `lib/` owns auth, Supabase access, legal parsing, retrieval, safety and the Space Bunny adapter.
- `supabase/migrations/` is the local schema history (001–016). The hosted database may differ; inspect before applying changes.
- `scripts/` includes verification, crawling and ingestion utilities. A script existing here does not mean it runs in production.
- Supabase service-role and AI provider secrets must remain server-side.

Read root `AGENTS.md` and the relevant docs before changing data contracts or privileged actions.
