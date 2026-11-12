"""Build a separate embedding version from reviewed articles for evaluation."""

from __future__ import annotations

import argparse
import asyncio
from uuid import UUID

from app.agents.policy import load_policy
from app.agents.semantic import build_shadow_embedding, store_shadow_batch
from app.core.db import Database
from app.core.settings import get_settings


async def build(limit: int, chunking_version: str) -> UUID:
    settings = get_settings()
    if not settings.agent_policy_file:
        raise ValueError("AGENT_POLICY_FILE is required")
    policy = load_policy(settings.agent_policy_file)
    db = await Database.connect(settings)
    try:
        articles = await db.fetch(
            """
            SELECT a.id, a.content
            FROM public.law_articles a
            JOIN public.laws l ON l.id = a.law_id
            WHERE l.classification_reviewed_at IS NOT NULL AND a.chunk_type = 'article'
            ORDER BY a.id
            LIMIT $1
            """,
            limit,
        )
        if not articles:
            raise ValueError("No reviewed article text was available")
        if any(
            not row["content"].strip() or len(row["content"].encode("utf-8")) > 8000
            for row in articles
        ):
            raise ValueError("A reviewed article exceeds the current embedding input limit")
        embeddings = {}
        for row in articles:
            embeddings[row["id"]] = await build_shadow_embedding(policy, row["content"])
        return await store_shadow_batch(db, embeddings, chunking_version=chunking_version)
    finally:
        await db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, required=True)
    parser.add_argument("--chunking-version", required=True)
    args = parser.parse_args()
    if not 1 <= args.limit <= 500:
        parser.error("--limit must be between 1 and 500")
    if not args.chunking_version.strip():
        parser.error("--chunking-version must be nonempty")
    index_id = asyncio.run(build(args.limit, args.chunking_version))
    print(f"Stored shadow index {index_id}")


if __name__ == "__main__":
    main()
