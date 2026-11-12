"""Short-lived SPIFFE/SPIRE mTLS workload identity rotator."""

from datetime import timedelta


DEFAULT_SVID_TTL = timedelta(minutes=15)


def issue_workload_svid(spiffe_id: str, revision: str) -> dict[str, str]:
    if not spiffe_id.startswith("spiffe://"):
        raise ValueError(f"Invalid SPIFFE trust domain URI: {spiffe_id}")
    return {
        "spiffe_id": spiffe_id,
        "revision": revision,
        "ttl_seconds": str(int(DEFAULT_SVID_TTL.total_seconds())),
    }
