# Rengera AI V2 server

FastAPI backend for the V2 rebuild. The legacy Next.js application remains in
`web/` and keeps its own routes, sessions and provider adapter until a verified
cutover; this service is developed and verified independently.

The implemented build is a **vertical slice**: API foundation, browser session
and RBAC snapshot, public law reading, and grounded synchronous answers. Planned
staff, ingestion, workflow and operational surfaces are listed as gaps, not as
shipped capabilities.

## Requirements

- Python 3.12+ managed by `uv`
- No hosted Supabase access, database or provider key is required for the
  foundation, auth-unit, law-fixture and answer-fixture tests.

## Run

```bash
cd server
uv sync
cp .env.example .env          # fill in only what the current slice needs
uv run uvicorn app.main:app --reload
```

Useful defaults: API at `http://localhost:8000`, interactive schema at `/docs`.
`/v1/meta` reports only the capabilities this build actually implements.

## Endpoints

All JSON routes live under `/v1`. Health routes stay outside the version prefix.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health/live` | Public | Process liveness; never checks external services. |
| `GET` | `/health/ready` | Public | Registered readiness checks; `503` when unavailable. |
| `GET` | `/v1/meta` | Public | API version, supported answer languages and implemented capabilities. |
| `POST` | `/v1/session` | Public | Sign in with email/password or exchange a Supabase access token for an opaque server session. |
| `GET` | `/v1/session` | Public | Current session snapshot; returns `200` with `authenticated: false` for anonymous callers. |
| `DELETE` | `/v1/session` | Session + CSRF | Revoke the server session and clear both cookies. |
| `GET` | `/v1/me` | Session | Verified account identity and capability snapshot. |
| `GET` | `/v1/laws` | Public | Lexical search, filters, category catalog and pagination. |
| `GET` | `/v1/laws/{law_id}` | Public | Law metadata, preamble and ordered articles, including repealed laws on an explicit deep link. |
| `GET` | `/v1/laws/{law_id}/articles/{article_number}` | Public | One exact stored article plus law-level provenance. |
| `POST` | `/v1/answers` | Public | Safety-first grounded question; deterministic outcomes for urgent, greeting and help inputs. |

Search parameters for `/v1/laws`: `query` (max 300 characters), `category`,
`status`, `page` (1-based) and `page_size` (1–50, default 20). `q` remains a
hidden deprecated alias for early clients; new clients must use `query`.
Repealed laws are excluded from search results, but an explicit detail or
article deep link still returns them with their stored status.

### Session and CSRF flow

`POST /v1/session` accepts exactly one mechanism:

- `{"email": "...", "password": "..."}` for the first-party web form. The server
  signs in through Supabase GoTrue using `SUPABASE_ANON_KEY`; the browser never
  needs the Supabase SDK or a token in JavaScript.
- `{"access_token": "..."}` for a client that already completed a Supabase
  sign-in, such as Flutter. The server verifies the token before creating a
  session.

A successful response sets two `SameSite=Lax` cookies:

- `rengera_session` — opaque, `HttpOnly`, server-side session record.
- `rengera_csrf` — readable double-submit token; the frontend sends it in
  `X-CSRF-Token` for unsafe methods.

The response also contains `csrf_token`, `expires_at` and a display-only
`capabilities` list. Cookie attributes come from `COOKIE_SECURE`,
`SESSION_TTL_SECONDS` and the cookie-name settings. Production assumes the API
and frontend share a site (or a proxy) so browser JavaScript can read the CSRF
cookie.

Role and permission names are fixed in `app/authorization/permissions.py`:
`user`, `staff`, `admin`; `law.read`, `law.draft`, `law.publish`,
`staff.manage`, `workflow.manage`, `analytics.read`. Claims from a Supabase
token never grant an application role. `GET /v1/me` and `GET /v1/session`
capabilities are presentation hints; every future privileged endpoint must
re-check the principal, permission and resource scope.

### Answer contract

`POST /v1/answers` accepts `question` (2–2000 characters), `language`
(`en`, `rw`, `fr`), and optional `law_id` / `article_number` references. The
client cannot submit article text. `kind` is one of five explicit outcomes:

| `kind` | Meaning |
| --- | --- |
| `answered` | Grounded answer with validated citations in `sources`. |
| `abstained` | No supported answer; `abstention_reason` explains why. |
| `emergency` | Deterministic urgent guidance and contacts; no model call. |
| `greeting` | Deterministic greeting; no model call. |
| `help` | Deterministic capability/usage help; no model call. |

Each source carries the law and article identity, stored status, classification
review state, bounded verbatim `excerpt`, citation, source URL when valid, and
content hashes where stored. `excerpt` is verbatim source text with an ellipsis
marker when truncated; it is never paraphrased.

Dependency failures are errors, not abstentions:

| Status | `error.code` | Meaning |
| --- | --- | --- |
| `503` | `search_unavailable` | The law library read failed. |
| `503` | `provider_not_configured` | No answer provider is configured. |
| `502` | `provider_unavailable` | The provider failed or timed out. |

Errors use the shared envelope `{"error": {"code", "message", "request_id"}}`
and repeat the request ID in the `X-Request-ID` header.

## Configuration

Copy `.env.example` to `.env`. Production startup fails when `APP_URL`,
`ALLOWED_ORIGINS`, `DATABASE_URL`, `SUPABASE_URL` or a token-verification key
(`SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`) is missing. CORS origins must be
exact `http(s)` origins; wildcards, paths, queries and fragments are rejected.

| Variable | Purpose |
| --- | --- |
| `APP_ENV`, `APP_NAME`, `APP_VERSION` | Environment label, display name and version reported by `/v1/meta`. |
| `APP_URL` | Public base URL of this API; required in production. |
| `ALLOWED_ORIGINS` | Comma-separated exact browser origins allowed with credentials. |
| `LOG_LEVEL`, `REQUEST_ID_HEADER`, `MAX_REQUEST_BYTES` | Logging threshold, correlation header name and request-size limit. |
| `DATABASE_URL`, `DATABASE_SSL`, `DB_POOL_MIN_SIZE`, `DB_POOL_MAX_SIZE` | Server-only Postgres connection and pool bounds. |
| `SUPABASE_URL` | Supabase project URL used for token verification and password sign-in. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never exposed to a client. Not required by the current public slice. |
| `SUPABASE_ANON_KEY` | Required for first-party email/password sign-in through GoTrue. |
| `SUPABASE_JWT_SECRET`, `SUPABASE_JWKS_URL` | HS256 shared secret or JWKS endpoint used to verify Supabase access tokens. |
| `SESSION_COOKIE_NAME`, `CSRF_COOKIE_NAME`, `COOKIE_SECURE`, `SESSION_TTL_SECONDS` | Opaque session and readable CSRF cookie behaviour; TTL is 60 s–7 days. |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS` | OpenAI-compatible provider. The model ID belongs here, never in feature code. |

Secrets are `SecretStr` values and are masked in logs and repr output. The
service-role key and provider key must stay server-side in every environment.

## Data and source rules

- Article and preamble text is returned exactly as stored. The API does not
  trim, normalize, summarize or rewrite source content.
- `review_status` (`reviewed` / `pending`) derives only from the stored review
  timestamp, and `review_scope` is always `classification`. It is **not** a
  claim that a lawyer or a human reviewed the legal text.
- Unknown stored status stays `unknown`; it is never defaulted to `active`.
- `languages_available` is returned exactly as stored, including `null`.
- `source_url` is returned only when it is a valid absolute `http(s)` URL.
- Retrieval and citation checks are deterministic. A provider failure or
  missing evidence never becomes a fabricated answer or a silent abstention.

## Check

```bash
cd server
uv run ruff check .
uv run pytest -q
uv run python -m scripts.export_openapi --check
```

`export_openapi --check` compares the runtime schema with
`../contracts/openapi/v1.json`; regenerate with
`uv run python -m scripts.export_openapi` only when a contract change is
intended. The TypeScript client under `platform/src/api/generated/` is
regenerated from that artifact and must not be hand-edited.

## Boundaries and known gaps

- No hosted Supabase project, hosted Postgres, migration `017` or live provider
  has been exercised. Session, law and answer tests use controlled fakes.
- No staff administration, ingestion, workflow, analytics or USSD endpoints yet;
  `/v1/meta` must not claim them before they exist.
- No streaming answer transport, refresh-token rotation, password reset,
  account deletion or OAuth PKCE flow.
- Email/password sign-in depends on Supabase GoTrue and `SUPABASE_ANON_KEY`;
  account migration from legacy `app_users` requires operator review and has not
  been performed.
- The generated Dart client and its compilation check are not part of this
  build. The TypeScript client covers the current contract.
- CORS, CSRF and cookie behaviour still need a browser end-to-end run against a
  controlled environment. Cross-site production cookie reading is unresolved;
  serve the API through the frontend site or proxy.
