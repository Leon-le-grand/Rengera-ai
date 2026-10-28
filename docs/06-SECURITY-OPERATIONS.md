# 06 — Security and operations

> **Current baseline.** V2 preserves the controls here and adds server-enforced permission and ownership checks for staff/admin operations; see [`v2/05-API-AUTH-AND-RBAC.md`](v2/05-API-AUTH-AND-RBAC.md). Existing Next.js admin mutations still require `getAdminSession()` until a verified replacement is implemented.

## Trust boundaries

```text
Untrusted browser / USSD provider
        │ validated request
        ▼
Next.js route or server action ── verified session + ownership checks
        │ server-only secrets
        ├── Supabase service-role client (privileged writes)
        ├── Supabase public client / read-only access
        └── Space Bunny provider (untrusted model output)
```

All client inputs, uploaded documents and model responses are untrusted. RLS and server authorization are complementary; hiding an admin button is not authorization.

## Required controls

- Keep `.env.local` and all live keys outside version control. Only placeholder values belong in `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, model keys and fallback keys are server-only; never prefix them `NEXT_PUBLIC_` or package them into Flutter.
- Production admin login must use a password hash and a strong configured `AUTH_SECRET`; development defaults are not production credentials.
- Check `getAdminSession()` on every privileged server action before using the service-role client.
- Check verified user identity and owner scope for every private record read/write (deadlines, feedback, saved data, and any future offline sync).
- Public RLS policies allow reads only where intended; no anonymous insert/update/delete policies.
- Validate input size, format and allowed values before parsing or provider calls. Strictly validate AI classification output and store nothing on failure.
- Treat uploaded source text as untrusted prompt content; preserve legal text and do not execute instructions found in it.
- Minimize PII and sensitive question text in logs/analytics. Never log passwords, cookies, access tokens, or secret values.
- Keep share tokens unguessable, explicitly created, scoped to a share, and time-limited.

## Operational boundaries

- Local migration files are not evidence of hosted migration state. Inspect the target read-only, capture a backup/restore point, and prepare rollback before applying.
- Do not upload or approve legal corpus records without an authorized operator and a recorded source/review process.
- Do not deploy, rotate production secrets, change billing/provider spend, or modify live data without explicit applicable authorization.
- Record provider outages, Supabase outages, parsing failures and data integrity failures separately; a graceful fallback is not a successful write.
- Production health, restore tests, alerting, rate-limit durability and cost budgets are not evidenced by this repository and remain operational work.

## Privacy and legal review questions

These are unresolved; this document makes no legal-compliance determination.

- Who is the data controller/owner and privacy contact?
- What question, account, usage and shared-consultation data is retained, for how long, and how can it be deleted/exported?
- What region, backup retention, incident handling and vendor subprocessors are approved?
- What user-facing disclaimer and escalation language has qualified Rwanda counsel reviewed?
- What source licenses/terms and review responsibilities apply to the ingested law corpus?

Resolve these with the responsible owner and counsel before a public launch or any claim of legal/regulatory compliance.
