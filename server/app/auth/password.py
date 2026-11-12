"""Native password hashing and verification using OWASP scrypt standard.

Stores hashes in the audit-compatible format:
``scrypt$cost_n$r$p$salt_hex$hash_hex``

Passwords and raw salts are never logged or exposed.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from typing import Final

logger = logging.getLogger("app.auth.password")

SCRYPT_N: Final[int] = 16384  # CPU/memory cost
SCRYPT_R: Final[int] = 8      # block size
SCRYPT_P: Final[int] = 1      # parallelization
SCRYPT_DKLEN: Final[int] = 64 # derived key length (604 bits)
SALT_BYTES: Final[int] = 16   # 128-bit cryptographically secure salt


def hash_password(password: str, *, salt: bytes | None = None) -> str:
    """Hash a plaintext password using standard scrypt.

    Produces an audit-safe string: ``scrypt$16384$8$1$<salt_hex>$<hash_hex>``
    """
    if not password:
        raise ValueError("Password cannot be empty")

    clean_salt = salt if salt is not None else secrets.token_bytes(SALT_BYTES)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=clean_salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        maxmem=0,
        dklen=SCRYPT_DKLEN,
    )
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${clean_salt.hex()}${derived.hex()}"


def verify_password(password: str, encoded_hash: str | None) -> bool:
    """Verify a plaintext password against an encoded scrypt hash in constant time."""
    if not password or not encoded_hash:
        return False

    parts = encoded_hash.strip().split("$")
    if len(parts) != 6 or parts[0] != "scrypt":
        return False

    try:
        n = int(parts[1])
        r = int(parts[2])
        p = int(parts[3])
        salt = bytes.fromhex(parts[4])
        expected_hash = bytes.fromhex(parts[5])
    except (ValueError, TypeError):
        return False

    # Bound computational parameters to prevent denial-of-service
    if n > 65536 or r > 16 or p > 16 or len(salt) < 8 or len(expected_hash) < 32:
        return False

    try:
        computed = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            maxmem=0,
            dklen=len(expected_hash),
        )
        return hmac.compare_digest(computed, expected_hash)
    except Exception:
        logger.exception("password_verification_error")
        return False


__all__ = [
    "hash_password",
    "verify_password",
]
