# 11 — Release handoff

## Local setup

### Web

```bash
cd web
pnpm install
cp ../.env.example .env.local
pnpm dev
```

Set only the variables needed for the local workflow. Keep live values in `.env.local` or the hosting provider; never paste secrets into tracked files or task notes.

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

Flutter tooling, Android SDK/JDK, iOS/Xcode and signing availability vary by machine. Record missing tooling as blocked rather than claiming a platform build passed.

## Configuration names

Source of truth is root `.env.example` plus actual reads in `web/lib/` and `web/app/`.

- Supabase server: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Model provider: `SPACE_BUNNY_API_KEY`, `SPACE_BUNNY_API_URL`, `SPACE_BUNNY_MODEL`; optional `SPACE_BUNNY_EMBEDDING_MODEL`, `SPACE_BUNNY_CHAT_TIMEOUT_MS`, `SPACE_BUNNY_TIMEOUT_MS`.
- Fallback provider: `AI_FALLBACK_API_KEY`, `AI_FALLBACK_API_URL`, `AI_FALLBACK_MODEL`.
- Sessions/admin: `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (development `ADMIN_PASSWORD` exists in the example; never rely on it in production).
- URL/optional listing: `APP_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`.

Never expose service-role/model/session secrets via `NEXT_PUBLIC_*` or the mobile bundle. Verify the exact runtime behavior of any environment variable before changing deployment config.

## Web deployment

`vercel.json` currently specifies `pnpm install` and `pnpm run build` from `web/`, with Next.js output. Confirm provider root-directory behavior and environment configuration in the target project before release. A local build does not deploy or verify production routing/secrets.

## Supabase migrations and data

- Ordered SQL files are `web/supabase/migrations/001_...sql` through `016_...sql`.
- `web/supabase/RUN_ALL.sql` and `web/scripts/build-run-all-sql.sh` are helper artifacts; review their generated order and idempotence before use.
- First inspect target migration/schema status read-only. Confirm backup/restore and rollback. Apply a migration to staging and review policies, functions and app compatibility before production.
- Do not run hosted migrations, upload the legal corpus or approve records as part of ordinary code deployment without explicit target-specific authorization.

## Mobile packaging

`mobile/android/` and `mobile/ios/` are the native Flutter platform projects. The former `web/android` Capacitor project has been removed in the current worktree; `docs/android/README.md` is only a supersession notice. Confirm application identifiers, signing material, store metadata, privacy disclosures and build configuration with the release owner before publishing.

## Rollback and handoff record

Before a production release, record commit/build identifier, environment, migration range, backup/restore point, smoke checks, owner, rollback trigger and rollback action. For app rollback, restore the last known deployable build; for schema/data, follow the separately reviewed migration recovery plan. Never promise rollback of a destructive migration without proving the restore path.

No production deployment or hosted database state was inspected while preparing this guide.
