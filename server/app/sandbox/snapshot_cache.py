"""Copy-on-write snapshot cache for Firecracker microVM pools."""


class SnapshotCache:
    def __init__(self, max_warm: int = 16) -> None:
        self.max_warm = max_warm
        self._warm_ids: list[str] = []

    def acquire(self, image_digest: str) -> str:
        if not self._warm_ids:
            raise LookupError(f"No warm microVM snapshots available for {image_digest}")
        return self._warm_ids.pop()
