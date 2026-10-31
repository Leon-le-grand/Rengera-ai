"""Deterministic OpenAPI export for the versioned HTTP contract."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Final

from app.core.settings import (
    DEFAULT_APP_NAME,
    DEFAULT_APP_VERSION,
    DEFAULT_REQUEST_ID_HEADER,
    Settings,
)
from app.main import create_app

REPO_ROOT: Final = Path(__file__).resolve().parents[2]
SCHEMA_PATH: Final = REPO_ROOT / "contracts" / "openapi" / "v1.json"
HTTP_METHODS: Final = frozenset(
    {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
)


def export_settings() -> Settings:
    """Fixed settings so the exported schema never depends on ambient environment."""
    return Settings(
        app_env="production",
        app_name=DEFAULT_APP_NAME,
        app_version=DEFAULT_APP_VERSION,
        app_url="https://api.example.invalid",
        allowed_origins="https://app.example.invalid",
        log_level="INFO",
        request_id_header=DEFAULT_REQUEST_ID_HEADER,
        database_url="postgresql://contract:contract@localhost:5432/contract",
        supabase_url="https://project.example.invalid",
        supabase_jwt_secret="contract-export-placeholder",
        _env_file=None,
    )


def build_schema() -> dict[str, Any]:
    return create_app(export_settings()).openapi()


def validate_operation_ids(schema: dict[str, Any]) -> None:
    """Every operation must declare a stable, unique operation ID."""
    operation_ids: list[str] = []
    for path_item in schema.get("paths", {}).values():
        for method, operation in path_item.items():
            if method not in HTTP_METHODS or not isinstance(operation, dict):
                continue
            operation_id = operation.get("operationId")
            if not isinstance(operation_id, str) or not operation_id:
                raise ValueError(f"{method.upper()} operation is missing an operationId")
            operation_ids.append(operation_id)
    duplicates = sorted(
        operation_id
        for operation_id, count in Counter(operation_ids).items()
        if count > 1
    )
    if duplicates:
        raise ValueError("duplicate operationIds: " + ", ".join(duplicates))


def render_schema() -> str:
    """Render the canonical contract text: sorted keys, two-space indent, trailing newline."""
    schema = build_schema()
    validate_operation_ids(schema)
    return json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def write_schema() -> Path:
    SCHEMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(render_schema(), encoding="utf-8", newline="\n")
    return SCHEMA_PATH


def check_schema() -> bool:
    """Return whether the committed contract matches the application exactly."""
    if not SCHEMA_PATH.exists():
        print(f"missing contract: {SCHEMA_PATH}", file=sys.stderr)
        return False
    committed = SCHEMA_PATH.read_text(encoding="utf-8")
    if committed != render_schema():
        print(
            "OpenAPI contract drift detected; run "
            "`uv run python -m scripts.export_openapi` and review the diff.",
            file=sys.stderr,
        )
        return False
    return True


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail when the committed contract differs from the generated one",
    )
    args = parser.parse_args(argv)
    if args.check:
        if not check_schema():
            return 1
        print(f"OpenAPI contract is current: {SCHEMA_PATH}")
        return 0
    path = write_schema()
    print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
