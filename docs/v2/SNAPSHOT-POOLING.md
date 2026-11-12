# Firecracker Snapshot Warm-Pool Lifecycle

To keep autonomous coding agent tool calls under 150ms cold start, worker nodes pre-warm memory and rootfs snapshots keyed by repository OCI digest and evict least-recently-used overlays via copy-on-write refcounts.
