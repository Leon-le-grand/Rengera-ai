# Rengera v4 System Architecture

## Control Plane & Data Plane Separation
Rengera separates **autonomous code synthesis** (Control Plane) from **ephemeral execution & edge routing** (Data Plane):

1. **Control Plane (`server/app/`)**: Raft-coordinated job scheduler, AST planner, OCI promotion state machine, and RBAC/SPIFFE identity issuer.
2. **Execution Plane (`server/app/sandbox/`)**: Warm-pooled Firecracker microVMs with copy-on-write rootfs overlays and sub-150ms cold-start snapshots.
3. **Edge Mesh (`server/app/deploy_mesh/`)**: Multi-region canary router with eBPF syscall guards and sub-second pointer-swap rollbacks.
4. **Mission Control (`platform/`) & Mobile (`mobile/`)**: Real-time diff inspection, rollout topology graphs, and on-call incident approvals.
