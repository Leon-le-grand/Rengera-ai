"""Speculative AST planner and multi-branch patch synthesizer."""

from dataclasses import dataclass


@dataclass
class PatchBranch:
    branch_id: str
    ast_hash: str
    score: float = 0.0


def synthesize_candidates(repo_root: str, goal: str, fanout: int = 8) -> list[PatchBranch]:
    # Placeholder coordinator; expects external microVM pool binding.
    raise RuntimeError(f"MicroVM pool not bound for {repo_root}: {goal} (fanout={fanout})")
