"""Automated test validating the multilingual retrieval benchmark."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any

import pytest

from scripts.eval_retrieval import evaluate_benchmark


def _corpus_available() -> bool:
    try:
        return importlib.util.find_spec("app.data.sample_laws") is not None
    except ModuleNotFoundError:
        return False


pytestmark = pytest.mark.skipif(
    not _corpus_available(),
    reason=(
        "Reviewed evaluation corpus (app.data.sample_laws) is not present in "
        "this checkout; the benchmark is skipped rather than scored against "
        "fabricated legal text."
    ),
)


@pytest.mark.asyncio
async def test_multilingual_benchmark_suite() -> None:
    benchmark_path = Path(__file__).parent / "evaluation" / "benchmark_qa.json"
    assert benchmark_path.is_file(), f"Benchmark file missing at {benchmark_path}"

    data: list[dict[str, Any]] = json.loads(benchmark_path.read_text(encoding="utf-8"))
    stats = await evaluate_benchmark(data, verbose=False)

    assert stats.total >= 50
    assert stats.failed == 0
    assert stats.emergency_accuracy == 1.0
    assert stats.abstention_accuracy == 1.0
    assert stats.citation_recall >= 0.95
