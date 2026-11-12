"""Multi-region canary rollout and eBPF telemetry gate."""

from typing import Literal


def promote_canary(artifact_uri: str, region: str, weight: int) -> dict[str, str | int]:
    if weight not in (1, 10, 50, 100):
        raise ValueError(f"Unsupported canary weight: {weight}")
    return {
        "artifact": artifact_uri,
        "region": region,
        "weight": weight,
        "status": "pending_ebpf_quorum",
    }


def trigger_rollback(deployment_id: str, reason: Literal["latency", "syscall", "manual"]) -> None:
    raise NotImplementedError(f"Edge pointer swap unavailable for {deployment_id} ({reason})")
