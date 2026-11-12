# Global Deployment Mesh (`deploy_mesh`)

## Overview
The `deploy_mesh` controller reconciles declarative service topologies into multi-region OCI rollouts.

### Canary Gates
- **p99 Latency Budget**: Auto-abort if regional p99 exceeds baseline by `>18%` for 3 consecutive windows.
- **eBPF Syscall Guard**: Flags unexpected outbound socket or `execve` transitions during canary soak.
- **Instant Pointer Swap**: Reverts edge routing tables in `<800ms` on quorum failure.
