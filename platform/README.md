# Rengera AI — V2 platform (preview)

The V2 frontend for Rengera AI. It is a rebuild of the citizen experience in
`platform/` while the Next.js application in `web/` remains the migration
baseline. This package is **not shipped** and does not replace `web/` yet.

It provides the public law library and reader, the question assistant, a local
emergency page, account settings, and guarded staff/admin shells. It never
invents laws, corpus coverage, legal authority, or an authenticated session:
every screen states what the configured API actually returned.

## Stack

- React 19 + TypeScript
- Vite 8
- TanStack Router (file-based routes) and TanStack Query
- Tailwind CSS 4 with the shared Rengera brand tokens
- Vitest + Testing Library

## Requirements

- Node.js `>=20.19.0`
- pnpm `12.x` (the version is pinned in `package.json`)

## Quick start

```bash
cd platform
pnpm install
cp .env.example .env      # optional; the default API base is http://localhost:8000
pnpm dev                  # http://localhost:5173
```

The frontend can start without an API. Public pages render, while session-aware
UI reports the account service as unavailable instead of pretending the visitor
is signed out or signed in. The FastAPI service is expected at
`VITE_API_BASE_URL` (default `http://localhost:8000`).

## Environment

| Variable              | Default                 | Purpose                          |
| --------------------- | ----------------------- | -------------------------------- |
| `VITE_API_BASE_URL`   | `http://localhost:8000` | Base URL of the versioned API    |
| `VITE_CSRF_COOKIE_NAME` | `rengera_csrf`        | Readable double-submit CSRF cookie |

Only `VITE_*` values reach the browser bundle. Never put secrets in them. The
transport sends `credentials: 'include'`, keeps the CSRF token in memory for
unsafe methods, and recovers it from the readable double-submit cookie after a
reload. It never stores the token in `localStorage`.

The API must allow the frontend origin with credentials and implement its own
CSRF/origin policy. Cookies must be set with the appropriate `SameSite`,
`Secure` and path settings for each environment. For cross-origin development
the readable CSRF cookie is still available because both dev servers share the
`localhost` host; production should serve the API through the same site or
proxy so browser JavaScript can read that cookie.

## Scripts

| Command                | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `pnpm dev`             | Vite development server                                  |
| `pnpm build`           | Typecheck, then produce `dist/`                          |
| `pnpm preview`         | Serve the production build locally                       |
| `pnpm typecheck`       | `tsc --noEmit`                                           |
| `pnpm lint`            | ESLint                                                   |
| `pnpm test`            | Vitest, single run                                       |
| `pnpm test:watch`      | Vitest in watch mode                                     |
| `pnpm routes:generate` | Regenerate `src/routeTree.gen.ts`                        |
| `pnpm generate:api`    | Generate the client from `../contracts/openapi/v1.json`  |

## Route map

| URL                                       | Access                    | Notes                                            |
| ----------------------------------------- | ------------------------- | ------------------------------------------------ |
| `/`                                       | Public                    | Landing page and entry points                    |
| `/login`                                  | Public                    | Email/password form; no sign-up or recovery      |
| `/403`                                    | Public                    | Access-denied explanation                        |
| `/chat`                                   | Public                    | Assistant; accepts `?q=` as a seeded question    |
| `/library`                                | Public                    | Search/filter/paginate; URL-backed filters       |
| `/laws/$lawId`                            | Public                    | Law metadata, review state and article list      |
| `/laws/$lawId/articles/$articleNumber`    | Public                    | Source-faithful article reader                   |
| `/emergency`                              | Public, no API dependency | EN/RW/FR urgent contacts and guidance            |
| `/settings`                               | Verified session          | Account state plus local theme/language settings |
| `/staff`                                  | `law.draft` or another staff grant | Guarded shell; workspace endpoints pending |
| `/admin`                                  | `law.publish` or another admin grant | Guarded shell; workspace endpoints pending |
| unmatched paths                           | Public                    | Honest not-found page                            |

`/settings`, `/staff` and `/admin` resolve the session in a route guard before
rendering. Anonymous visitors are redirected to `/login` with a validated local
return path. A network failure does **not** become a logout: the protected layout
shows an unavailable state with a retry.

## Auth model

The auth store (`src/auth/auth-store.ts`) is framework-agnostic so route guards
can await it and React can subscribe via `useSyncExternalStore`. It has four
states:

- `loading` — the initial `GET /v1/session` is in flight.
- `anonymous` — the server explicitly returned no identity (including `401`).
- `authenticated` — the server returned a verified account identity.
- `unavailable` — the check failed, timed out, or returned an unreadable
  payload. This is never downgraded to `anonymous`.

A signed-in state is produced only from a verified identity; a contradictory
payload (for example `authenticated: true` without a user id) becomes
`unavailable`. On logout or an account-identity change, all Query caches are
cancelled and cleared. Capability changes remove only the private query root.
Private query keys include the verified account id (`src/api/query-keys.ts`).

Capability names (`law.read`, `law.draft`, `law.publish`, `staff.manage`,
`workflow.manage`, `analytics.read`) are the server-owned permissions from
`server/app/authorization/permissions.py`. They are **presentation hints**.
Hiding a link is not authorization; every server endpoint must verify the
principal, capability, and resource scope again.

## API integration

`src/api/client.ts` is the single JSON transport. It owns:

- base URL, `credentials: 'include'`, and request timeouts
- the in-memory CSRF header for unsafe methods
- normalized `ApiError` values, request IDs, and a single `401` handler

Feature modules normalize payloads at the boundary so missing or malformed data
fails safely. A successful response that cannot be understood becomes an honest
`unavailable` or protocol error; it is never turned into a fabricated answer,
law, or session.

### Contract status

`../contracts/openapi/v1.json` defines the implemented v1 endpoints: health,
metadata, session lifecycle, current account, law search/detail/article and the
grounded answer operation. `pnpm generate:api` generates `src/api/generated/`
from it using `@hey-api/openapi-ts`.

The citizen screens still use the small handwritten transport and normalizers
in `src/api/` because they tolerate documented aliases and convert malformed
payloads into honest unavailable states. Generated request/response types are
available for the migration; replacing the handwritten wrappers is a follow-up
that must not weaken those failure guarantees. The server operations covered
are:

| Method   | Path                              | Used by             |
| -------- | --------------------------------- | ------------------- |
| `GET`    | `/v1/session`                     | Auth bootstrap      |
| `POST`   | `/v1/session`                     | Email/password or token sign-in |
| `DELETE` | `/v1/session`                     | Sign out            |
| `GET`    | `/v1/me`                          | Verified account snapshot |
| `GET`    | `/v1/laws`                        | Library list        |
| `GET`    | `/v1/laws/{lawId}`                | Law/article reader  |
| `GET`    | `/v1/laws/{lawId}/articles/{articleNumber}` | Article deep link |
| `POST`   | `/v1/answers`                     | Chat                |

Do not hand-edit `src/api/generated/`.

## Data and content rules

- Law text is rendered as returned by the API; the reader does not rewrite,
  summarize, or “correct” source content.
- Summaries, classifications, law status and review status are displayed as
  stored metadata. “Reviewed” means the record says so, not that this frontend
  verified it.
- The library makes no completeness or accuracy claim. Empty results are
  distinguished from filtered misses and API failures.
- No sample laws, fake staff queues, invented counts, or simulated sessions are
  included.
- The assistant checks for urgent language locally before sending. The user can
  call 112 or open `/emergency` instead, or explicitly continue. `/emergency`
  works without an account or API call.
- Answers must show evidence or state that no supported answer was found.

## Hosting and deep links

This is a client-side SPA. The host must serve `index.html` for unknown paths so
direct visits to `/laws/...`, `/chat` and the other routes work:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Keep hashed files under `/assets/` cacheable as immutable. Do not add a service
worker without a cache-invalidation and privacy review.

## Project layout

```
src/
  api/          transport, normalization, query keys, generated client
  app/          providers, router, theme
  auth/         auth store, guards, capabilities, session parsing
  components/   layout, brand and UI primitives
  features/     landing, auth, chat, library, laws, emergency, settings, workspace
  routes/       TanStack Router file routes and the generated route tree
  styles/       Tailwind entry and brand tokens
```

## Checks performed

On 2026-10-28, in `platform/`:

- `pnpm lint` — passed with 0 errors and 0 warnings
- `pnpm typecheck` — passed
- `pnpm test` — 12 files, 94 tests passed
- `pnpm build` — passed; `dist/` produced
- `pnpm routes:generate` — passed; only an upstream circular-dependency warning
- `pnpm generate:api` — passed against the current session/law/answer contract
- `pnpm preview` smoke test — `/` and a deep article URL both returned
  `200 text/html` (verifying the SPA history fallback)

The test environment reports a jsdom startup cost; that is a performance note,
not a failure.

## Known gaps

- No streaming answer transport, answer review queue, ingestion UI, staff
  administration, password reset, account deletion or token-refresh flow.
- The generated client is checked in and compiled, but the citizen screens still
  call the handwritten transport wrappers.
- No browser end-to-end run against a live API, Postgres or Supabase project has
  been performed. Session, CSRF, law and answer behavior is covered by unit and
  contract tests with controlled fakes.
- The mobile app (`mobile/`) and the Next.js baseline (`web/`) are separate
  projects and are not modified by this package.
- This preview is not a production deployment and has not been validated
  against a hosted corpus.

See the repository-level `TASKS.md`, `MEMORY.md` and `docs/v2/README.md` for
migration status and decisions.
