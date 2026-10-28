# V2 system architecture

## Baseline and target

Today the web app is a Next.js modular monolith; Flutter is a prototype, and no standalone `server/` exists. The requested target is React/Vite, TanStack Router/Query and a separate Python/FastAPI backend, with Flutter using the same versioned API. Migrate capability by capability and preserve the current application during cutover.

```mermaid
flowchart LR
  Web[React / TanStack] --> API[FastAPI modular application]
  Mobile[Flutter] --> API
  USSD[USSD provider] --> API
  API --> Auth[Identity and RBAC]
  API --> Laws[Law library and retrieval]
  API --> Workflow[Bounded answer workflow]
  Workflow --> Model[Provider adapter]
  API --> Jobs[Durable ingestion jobs]
  Jobs --> Worker[Ingestion worker]
  Auth --> DB[(Supabase Postgres)]
  Laws --> DB
  Worker --> DB
  Worker --> Store[Source PDF storage]
```

Keep auth, laws, retrieval, answer flow, provider adapter, ingestion and observability as independently testable modules inside one backend codebase. Run a separate worker process for expensive ingestion; avoid network microservices per module. One explicit legal-answer pipeline is the initial workflow. Add generic graph editing and multiple agents only for a demonstrated use case, after evaluation and authorization controls.

React contains UI and generated API clients; the server owns authentication, authorization, data access, safety, retrieval, orchestration and provider secrets. Flutter never imports web runtime code. Supabase stores legal data and source PDFs; no client receives its service-role key. Module contracts and proposed folders are detailed in [research](RESEARCH.md#target-repository-layout).

## Dependency boundaries

Provider failure leaves the reader, search and urgent path available when their own dependencies work. Embedding/index failure falls back to exact and lexical search. Worker/queue failure delays ingestion without changing published laws. Identity failure prevents protected actions but need not take down public source access. Database or API failure blocks live legal lookup; static urgent guidance may remain available if safely packaged and maintained. Each fallback requires implementation and failure tests; it is not guaranteed by a diagram.

## Decisions and migration

Use FastAPI and Supabase Auth as target starting choices; verify auth/session migration and representative performance. Use one provider adapter and configuration boundary, and preserve the existing `space-bunny.ts` model gateway until server cutover. Hosting and queue vendors remain unselected pending measured cost, connectivity and operational comparison. Record the requested architecture in the governing decision/spec documents before dependent implementation; the current app keeps its existing admin guards until replaced safely. See [plan](PLAN_RESEARCH.md) and [review](ARCHITECTURE_REVIEW.md).
