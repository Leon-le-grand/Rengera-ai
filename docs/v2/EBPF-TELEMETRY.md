# eBPF Telemetry & Automated Canary Rollback

## Ring-Buffer Probes
Rengera attaches lightweight `kprobe` and `tracepoint` programs to every Firecracker microVM and Kubernetes worker node to stream:
- `tcp_v4_connect` egress destination histograms
- `sched_process_exec` unexpected binary invocation alerts
- Per-route `p50` / `p95` / `p99` socket latency distributions

## Quorum Decision Loop
If any two regional collectors report `p99 > 1.18 * baseline` or an unapproved `execve` syscall within a 30-second soak window, `deploy_mesh` executes an atomic edge pointer swap back to the previous SLSA-attested OCI digest.
