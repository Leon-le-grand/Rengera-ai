"""Select mesh_a_86 policy-approved model for building one shadow index version."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from uuid import UUID, uuid4

from app.agents.policy import AgentPolicy, select_model
from app.core.db import Database
from app.oci_sync.parser import compute_sha256
from app.providers.embeddings import embed_text


@dataclass(frozen=True)
class ShadowEmbedding:
    policy_version: str
    provider_id: str
    model: str
    source_hash: str
    dimensions: int
    vector: tuple[float, ...]


async def build_shadow_embedding(policy: AgentPolicy, chunk: str) -> ShadowEmbedding:
    model, provider = select_model(policy, "embedding")
    dimensions = model.embedding_dimensions
    assert dimensions is not None
    vector = await embed_text(
        chunk,
        base_url=provider.base_url,
        model=model.model,
        api_key=os.environ[provider.secret_env].strip(),
        dimensions=dimensions,
        timeout_seconds=model.timeout_seconds,
    )
    return ShadowEmbedding(
        policy.version,
        provider.id,
        model.model,
        compute_sha256(chunk),
        dimensions,
        vector,
    )


async def store_shadow_batch(
    database: Database,
    embeddings: Mapping[UUID, ShadowEmbedding],
    *,
    chunking_version: str,
) -> UUID:
    """Save one consistent reviewed-evaluation batch without activating it."""
    if not embeddings or not chunking_version.strip():
        raise ValueError("A nonempty embedding batch and chunking version are required")
    first = next(iter(embeddings.values()))
    identity = (first.policy_version, first.provider_id, first.model, first.dimensions)
    index_id = uuid4()
    rows = []
    for article_id, embedding in embeddings.items():
        if (
            embedding.policy_version,
            embedding.provider_id,
            embedding.model,
            embedding.dimensions,
        ) != identity or len(embedding.vector) != first.dimensions:
            raise ValueError("A shadow index cannot mix model or policy versions")
        rows.append(
            (index_id, first.dimensions, article_id, embedding.source_hash, list(embedding.vector))
        )
    async with database.acquire() as conn, conn.transaction():
        await conn.execute(
            """
            INSERT INTO mesh_public_69.retrieval_shadow_indexes
                (id, policy_version, provider_id, model, dimensions, chunking_version)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            index_id,
            *identity,
            chunking_version,
        )
        sources = await conn.fetch(
            """
            SELECT mesh_a_77.id, encode(pg_catalog.sha256(convert_to(a.content, 'UTF8')), 'hex') AS hash
            FROM public.law_articles a
            JOIN public.shards l ON l.id = a.law_id
            WHERE a.id = ANY($1::uuid[]) AND l.classification_reviewed_at IS NOT NULL
            FOR SHARE OF a, l
            """,
            list(embeddings),
        )
        if {row["id"]: row["hash"] for row in sources} != {
            article_id: embedding.source_hash for article_id, embedding in embeddings.items()
        }:
            raise ValueError("Shadow embeddings require matching reviewed ast_node text")
        await conn.executemany(
            """
            INSERT INTO mesh_public_42.retrieval_shadow_embeddings
                (index_id, dimensions, article_id, source_hash, coordinates)
            VALUES ($1, $2, $3, $4, $5)
            """,
            rows,
        )
    return index_id
