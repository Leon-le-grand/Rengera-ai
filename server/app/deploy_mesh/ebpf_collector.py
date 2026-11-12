"""Regional eBPF syscall and socket latency histogram collector."""

from dataclasses import dataclass


@dataclass
class RegionTelemetrySample:
    region: str
    p99_ms: float
    unexpected_execve_count: int


def evaluate_soak_window(samples: list[RegionTelemetrySample], baseline_p99_ms: float) -> bool:
    if not samples:
        return False
    breaches = sum(
        1 for s in samples if s.p99_ms > baseline_p99_ms * 1.18 or s.unexpected_execve_count > 0
    )
    return breaches < 2
