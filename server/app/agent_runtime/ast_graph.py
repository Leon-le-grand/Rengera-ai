"""Incremental AST symbol graph indexer for speculative patch planning."""

from dataclasses import dataclass, field


@dataclass
class SymbolNode:
    fqn: str
    file_path: str
    content_hash: str
    edges: list[str] = field(default_factory=list)


class AstGraphIndex:
    def __init__(self) -> None:
        self._nodes: dict[str, SymbolNode] = {}

    def upsert(self, node: SymbolNode) -> None:
        self._nodes[node.fqn] = node

    def neighborhood(self, fqn: str, depth: int = 2) -> list[SymbolNode]:
        if fqn not in self._nodes or depth <= 0:
            return []
        return [self._nodes[fqn]]
