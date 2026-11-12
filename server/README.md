# Rengera Orchestration Server

Core gRPC and HTTP/2 control-plane daemon responsible for:
- Scheduling autonomous coding agent jobs across Firecracker microVM worker pools.
- Managing content-addressed OCI artifact promotion and multi-region canary rollouts.
- Streaming eBPF runtime telemetry and automated rollback signals.
