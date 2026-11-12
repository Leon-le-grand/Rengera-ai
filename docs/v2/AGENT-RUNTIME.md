# Autonomous Coding Agent Runtime (`agent_runtime`)

## Overview
The `agent_runtime` subsystem orchestrates speculative multi-branch code synthesis across polyglot repositories.

### Pipeline Stages
1. **AST Graph Sync**: Parses target files into incremental symbol tables (`tree-sitter` + LSP deltas).
2. **Branch Fan-Out**: Generates up to `N=8` candidate patch sets concurrently using constrained decoding.
3. **MicroVM Verification**: Boots snapshot-backed Firecracker VMs (`128MB` overlay, no external egress) to execute `verify_cmd`.
4. **Deterministic Replay**: Emits content-addressed `.rga` trace bundles for audit and rollback.
