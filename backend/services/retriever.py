import os
import threading
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from interfaces.retriever_interface import RetrieverInterface
from models.schemas import RetrievedChunk

COLLECTION_NAME = "docsense"

# voyage-3 produces 1024-dim vectors; update if switching embedding models.
# voyage-3-lite produces 512-dim vectors.
VECTOR_SIZE = int(os.getenv("VECTOR_SIZE", 1024))


class QdrantRetriever(RetrieverInterface):
    """
    Qdrant in-memory retriever — no compilation, no native extensions,
    pre-built wheels on all platforms including Windows.

    Trade-off vs Chroma: index is not persisted across server restarts.
    Documents must be re-ingested after restart. Acceptable for Phase 1
    portfolio use; Phase 2 can switch to QdrantClient(path="./qdrant_db")
    for persistence or a hosted Qdrant cluster via QdrantClient(url=...).

    The RetrieverInterface abstraction means that swap is one line in main.py.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._client = QdrantClient(":memory:")
        self._client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )

    # ------------------------------------------------------------------
    # Write path
    # ------------------------------------------------------------------

    def add_chunks(self, chunks: list[dict]) -> None:
        """
        Store embedded chunks in Qdrant.

        Each chunk dict must contain:
          - content: str
          - embedding: list[float]
          - document_id, document_name, section_header, last_modified,
            indexed_at, content_hash, source_type, chunk_index

        Content is stored in the payload alongside metadata so a single
        search call returns everything needed to build RetrievedChunk.
        """
        points = [
            PointStruct(
                id=str(uuid.uuid4()),   # Qdrant requires UUID or uint64
                vector=c["embedding"],
                payload={
                    "chunk_id": f"{c['document_id']}_{c['chunk_index']}",
                    "document_name": str(c["document_name"]),
                    "document_id": str(c["document_id"]),
                    "section_header": str(c["section_header"]),
                    "last_modified": str(c["last_modified"]),
                    "indexed_at": str(c["indexed_at"]),
                    "content_hash": str(c["content_hash"]),
                    "source_type": str(c["source_type"]),
                    "chunk_index": int(c["chunk_index"]),
                    "content": str(c["content"]),
                },
            )
            for c in chunks
        ]
        with self._lock:
            self._client.upsert(collection_name=COLLECTION_NAME, points=points)

    # ------------------------------------------------------------------
    # Read path
    # ------------------------------------------------------------------

    def query(self, query_vector: list[float], top_k: int) -> list[RetrievedChunk]:
        """
        Retrieve top-K chunks by cosine similarity.

        Qdrant returns cosine similarity directly (not distance),
        so no conversion is needed — scores are already in [0, 1].
        """
        with self._lock:
            response = self._client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                limit=top_k,
                with_payload=True,
            )

        chunks = []
        for result in response.points:
            p = result.payload
            chunks.append(
                RetrievedChunk(
                    chunk_id=p["chunk_id"],
                    document_name=p["document_name"],
                    section_header=p["section_header"],
                    last_modified=p["last_modified"],
                    content=p["content"],
                    similarity_score=round(result.score, 4),
                )
            )
        return chunks

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    def delete_document(self, document_id: str) -> None:
        """Remove all chunks belonging to document_id."""
        with self._lock:
            self._client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id),
                        )
                    ]
                ),
            )

    def get_status(self) -> dict:
        """Return document_count, chunk_count, and last_indexed timestamp."""
        with self._lock:
            chunk_count = self._client.count(collection_name=COLLECTION_NAME).count
            if chunk_count == 0:
                return {"document_count": 0, "chunk_count": 0, "last_indexed": None}
            points, _ = self._client.scroll(
                collection_name=COLLECTION_NAME,
                with_payload=True,
                limit=chunk_count,
            )

        document_ids = {p.payload["document_id"] for p in points}
        last_indexed = max(p.payload["indexed_at"] for p in points)

        return {
            "document_count": len(document_ids),
            "chunk_count": chunk_count,
            "last_indexed": last_indexed,
        }
