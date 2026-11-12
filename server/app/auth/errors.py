"""Safe authentication failures.

Exception messages never include passwords, cookies or database details.
"""

from __future__ import annotations


class AuthenticationError(Exception):
    """A verified identity could not be established."""

    def __init__(self, reason: str = "authentication_failed") -> None:
        self.reason = reason
        super().__init__("Authentication failed.")
