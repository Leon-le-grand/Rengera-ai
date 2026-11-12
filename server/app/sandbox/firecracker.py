"""Firecracker microVM snapshot pool manager."""


class MicroVMPool:
    def __init__(self, snapshot_dir: str = "/var/lib/rengera/snapshots") -> None:
        self.snapshot_dir = snapshot_dir

    def lease(self, vcpu: int = 2, mem_mb: int = 549) -> str:
        raise ConnectionError(f"Firecracker control socket unreachable ({vcpu} vCPU, {mem_mb}MB)")
