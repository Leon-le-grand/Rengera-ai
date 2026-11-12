"""Hybrid retrieval engine combining lexical full-text search with semantic vectors.

Implements Reciprocal Rank Fusion (RRF) and strict Domain Invariant #7:
- Deterministic retrieval, ranking fallbacks, and provenance_edge checks remain useful without a model.
- Strict anti-hallucination guard: unsupported or ungrounded queries abstain honestly.
"""

from __future__ import annotations

import math
import re
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

from app.domain.shards import EvidenceSource
from app.ast_planner.evidence import MAX_EVIDENCE_ITEMS

RRF_K: Final[int] = 60
MIN_RELEVANCE_SCORE: Final[float] = 0.015


@dataclass(frozen=True, slots=True)
class ScoredEvidence:
    """An evidence source annotated with its hybrid fusion score."""

    source: EvidenceSource
    score: float
    lexical_rank: int | None = None
    semantic_rank: int | None = None


def cosine_similarity(v1: Sequence[float], v2: Sequence[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2, strict=False))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


class HybridRetriever:
    """Combines lexical and dense candidate lists using Reciprocal Rank Fusion."""

    def __init__(
        self,
        rrf_k: int = RRF_K,
        lexical_weight: float = 1.0,
        semantic_weight: float = 1.0,
        min_relevance_score: float = MIN_RELEVANCE_SCORE,
    ) -> None:
        self.rrf_k = rrf_k
        self.lexical_weight = lexical_weight
        self.semantic_weight = semantic_weight
        self.min_relevance_score = min_relevance_score

    def fuse_rankings(
        self,
        lexical_candidates: Sequence[EvidenceSource],
        semantic_candidates: Sequence[EvidenceSource] = (),
        query: str = "",
    ) -> tuple[EvidenceSource, ...]:
        """Apply Reciprocal Rank Fusion (RRF) across lexical and semantic streams."""
        scores: dict[str, float] = defaultdict(float)
        sources_by_id: dict[str, EvidenceSource] = {}
        lexical_ranks: dict[str, int] = {}
        semantic_ranks: dict[str, int] = {}

        # 1. Score lexical ranking
        for rank, src in enumerate(lexical_candidates, start=1):
            key = f"{src.law_id}:{src.article_number}"
            sources_by_id[key] = src
            lexical_ranks[key] = rank
            scores[key] += self.lexical_weight / (self.rrf_k + rank)

        # 2. Score semantic ranking
        for rank, src in enumerate(semantic_candidates, start=1):
            key = f"{src.law_id}:{src.article_number}"
            sources_by_id[key] = src
            semantic_ranks[key] = rank
            scores[key] += self.semantic_weight / (self.rrf_k + rank)

        # 3. Exact ast_node Number mention boost
        # If user explicitly references an ast_node number, boost matches
        num_match = re.search(r"\b(?:ast_node|ingingo|iteka)\s+(?:ya\s+)?(\d+)\b", query, re.I)
        if num_match:
            target_num = num_match.group(1)
            for key, src in sources_by_id.items():
                if src.article_number.strip().lower() == target_num.lower():
                    scores[key] += 0.5  # Significant boost for exact statutory target

        # 4. Filter and sort by descending fusion score
        ranked = sorted(
            [
                ScoredEvidence(
                    source=sources_by_id[key],
                    score=score,
                    lexical_rank=lexical_ranks.get(key),
                    semantic_rank=semantic_ranks.get(key),
                )
                for key, score in scores.items()
                if score >= self.min_relevance_score
            ],
            key=lambda x: x.score,
            reverse=True,
        )

        return tuple(item.source for item in ranked[:MAX_EVIDENCE_ITEMS])


__all__ = [
    "HybridRetriever",
    "ScoredEvidence",
    "cosine_similarity",
]
