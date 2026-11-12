# Speculative AST Graph Compiler

## Incremental Symbol Indexing
Rather than scanning flat text, `agent_runtime` maintains a persistent incremental AST + call-graph index keyed by content hash.

## Parallel Branch Pruning
1. Given a natural-language engineering goal, the planner decomposes the target into affected symbol neighborhoods.
2. Up to 8 candidate AST mutations are synthesized in parallel.
3. Candidates failing type-checking or static invariant checks are pruned immediately before microVM boot.
4. Surviving candidates are benchmarked inside snapshot-backed Firecracker VMs and ranked by deterministic test pass rate and diff minimality.
