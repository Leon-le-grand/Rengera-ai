# V2 API, authentication and RBAC

## API contract

FastAPI exposes versioned OpenAPI with stable unique operation IDs, explicit schemas, security, errors and media types. Pin Hey API to generate TypeScript SDK and TanStack Query options; generate a Dart client with a compatible OpenAPI Generator configuration. CI exports and validates the contract, regenerates clients, detects drift and compiles consumers. Keep handwritten auth/CSRF/stream adapters outside generated output. Generated types do not replace server validation.

Initial groups include `/v1/session`, `/v1/me`, `/v1/laws`, `/v1/answers`, owner-scoped deadlines/shares, staff ingestion, admin review/staff/workflows/analytics, and the USSD callback. Synchronous answer requests are the first contract; define session-bound access, event schemas, cancellation and retention separately before adding asynchronous answers or SSE. See [endpoint inventory and examples](RESEARCH.md#openapi-generated-clients-and-route-inventory).

## Identity and permission checks

Use Supabase Auth as the starting identity design. Browser uses a same-origin API session with secure HTTP-only cookie, CSRF and origin checks; Flutter uses secure native storage and bearer tokens, with OAuth authorization-code/PKCE for OAuth flows. Validate issuer, audience, signature, expiry, active account and session revocation. Rehearse mapping current `app_users` and ownership; do not assume password hashes are importable. No service key in a client.

Use server-owned roles `user`, `staff`, `admin`, and guest without role; assign explicit permissions and deny by default. Staff may inspect jobs, submit ingestion and edit drafts. Admin reviews/publishes and manages staff; ordinary staff management cannot grant admin. Users access only their own private records. Enforce permissions and ownership on every API request and tool call; audit privileged changes and protect final-admin recovery. RLS is defense in depth; service-role access bypasses it.

TanStack Router `beforeLoad` and `<Can>` use a server capability snapshot only for UI/navigation. TanStack Query keys include account and resource identity; cancel and remove private data on logout, role revocation or account switch. Server denial wins over stale UI. For cross-origin browser access use exact per-environment allowed origins/methods/headers, credential rules and CSRF protection; CORS is not authentication and does not constrain native clients. See [full RBAC matrix](RESEARCH.md#end-to-end-authorization-and-staff-management).
