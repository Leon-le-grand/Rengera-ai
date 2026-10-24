# 04 — Interfaces and contracts

This is a route/action index, not a promise that all future client APIs exist. Server action arguments and result types in source are authoritative; update this document when those contracts change.

## Web request surfaces

| Surface | Current entry point | Contract boundary |
| --- | --- | --- |
| Citizen chat | `generateLegalAdvice` in `web/app/actions.ts` | User question + selected answer language → grounded answer, source references, or safe abstention/error |
| Sign-in/sign-up | `web/app/auth-actions.ts` | Form input → validated citizen/admin session result; passwords must not be logged or returned |
| Law ingestion, search and review | `web/app/legal-actions.ts` | Admin writes require `getAdminSession()`; public library reads expose only approved public fields |
| Deadlines, feedback, alerts and usage | `web/app/product-actions.ts` | User-owned reads/writes are scoped to the authenticated owner; admin analytics remain admin-only |
| Consultation sharing | `web/app/share-actions.ts`, `web/app/share/[token]/page.tsx` | Explicit bearer token; expiry is enforced; public view contains only the shared consultation payload |
| USSD | `GET`/`POST /api/ussd` in `web/app/api/ussd/route.ts` | Provider callback/session → concise response; deterministic/RPC path, no model call |
| Mobile auth | `POST /api/mobile/auth` in `web/app/api/mobile/auth/route.ts` | Accepts JSON email/password; invokes `signIn` and returns success/user/account. `signIn` creates the web HTTP-only cookie, but this response contains no bearer token; Flutter's current Dio path does not persist a cookie/token. Auth is not a complete mobile session contract. |

## Data access and trust contracts

- Browser code uses public/read-only data access only. The server-side Supabase admin client is in `web/lib/supabase.ts` and requires the service-role key.
- Every server action is a public invocation boundary: validate its arguments and enforce session/ownership checks inside the action, not only in the UI.
- `web/lib/space-bunny.ts` owns model endpoint, model ID, key, timeouts and optional fallback configuration.
- Search RPCs and row shapes are versioned by migrations. Check SQL return columns against `web/lib/supabase-retrieval.ts` and callers before changing either side.
- Never pass a client-controlled role, user id, law status, citation, or review state as authorization evidence.

## Error behavior

| Condition | Required product behavior |
| --- | --- |
| No retrieved source or no sufficiently relevant evidence | Honest abstention and a route to the library; no model-only legal answer |
| Citation is unresolved under the verifier | Discard/replace according to the current deterministic guard; never present as verified |
| Emergency signal | Return configured emergency instructions before retrieval/model generation |
| Invalid AI classification/schema | Fail the operation and persist nothing |
| Provider unavailable | Report temporary unavailability or use an explicitly configured fallback; never fabricate |
| Supabase unavailable/unconfigured | Show a distinct data/service error, not an empty successful library |
| Unauthorized admin action or wrong record owner | Reject without revealing protected record data |
| Expired share token | Show unavailable/expired state and do not return the shared record |

## API evolution

Before mobile feature development, decide and document whether Flutter calls the existing route handlers, Supabase RPCs, or a future API facade. Resolve the current cookie/token mismatch first. Define auth renewal, rate limits, payload schemas, retry/idempotency, pagination, versioning, offline queue ownership and conflict resolution before shipping writes from an offline client.
