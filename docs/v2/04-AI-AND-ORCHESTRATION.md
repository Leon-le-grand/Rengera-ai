# V2 AI and orchestration

## Initial workflow

```text
Request → deterministic safety → retrieval → evidence sufficiency
        → optional model draft → schema/citation checks → answer or abstention
```

Start with an explicit coded workflow inside the backend. Keep interfaces for provider, retrieval, policy and validation so another workflow can be added without a rewrite. Do not require a generic workflow editor or a team of agents to answer a question. Model providers do not receive service-role credentials.

## Configuration

Server-controlled provider profiles hold endpoint, secret-manager reference, timeouts and concurrency limits. Model profiles hold task, model identifier, limits, allowed languages and evaluated fallback. Workflow versions define permitted steps/tools, schema, budget, retry and deadline. Secrets never appear in the frontend or API responses. Use draft → validate → evaluate → stage → activate → retire with audit and rollback; activation requires server authorization.

Every tool invocation independently validates input, verified principal, permission, resource scope, side effects and budget. Mutations require deliberate authorization and idempotency. Retrieved documents and uploads are untrusted data, not instructions. Bound parallel steps, iterations and tokens. A failed model or invalid output cannot bypass source/safety checks. Return progress only until final validation if streaming is later adopted.

An early implementation may express these rules in code and configuration rather than a graph editor. The detailed proposed workflow schema, evidence structure, API examples and tests are in [research](RESEARCH.md#agent-runtime-and-configuration-specification).
