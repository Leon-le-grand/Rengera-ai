# V2 operations and failure isolation

## Operational model

Deploy stateless API replicas and a separate worker from one modular backend codebase, plus React static hosting, Supabase and a durable queue. Choose actual providers/regions after measuring latency, cost, availability and data requirements; do not assume multiple vendors improve reliability. Use environment separation, TLS, least-privilege credentials, secret management, quotas, idempotency, request deadlines and tested backup/restore. No hosted changes or spend without applicable authorization.

Bound interactive and ingestion concurrency separately; cap total database pools and provider calls across replicas. Apply backpressure, durable job state, bounded retry, dead-letter review and reconciliation. Load-test a representative workload before setting performance or availability claims. Keep cached private content isolated per account.

## Visibility and degradation

Expose process liveness independent of external services, readiness for actual traffic, and separate component status for database, storage, auth, legal search, model provider, queue, worker, semantic index and USSD. A status has healthy/degraded/unavailable/unknown state, timestamp and evidence. Use metrics, traces, redacted logs, external synthetic checks and alerts with an assigned owner. Do not expose credentials or sensitive legal questions.

| Failure | Expected result |
| --- | --- |
| Model provider | Reader, search and urgent guidance continue if their own dependencies work; answer generation reports unavailable or uses an evaluated fallback. |
| Embedding/index | Exact and lexical search continue. |
| Worker/queue | Published corpus remains readable; ingestion is delayed or explicitly rejected. A durable outbox/reconciliation mechanism prevents lost dispatches. |
| Auth provider | Protected actions fail closed; public paths may continue independently. |
| Database | Live lookup, sessions and jobs fail safely; packaged urgent guidance may remain accessible. |
| Storage | Database text can remain available; PDF access and uploads show failure. |

See [architecture review](ARCHITECTURE_REVIEW.md) and [capacity contract](RESEARCH.md#capacity-and-failure-contract). Test each scenario; diagrams do not prove resilience.
