from abc import ABC, abstractmethod

from models.schemas import RetrievedChunk


class RetrieverInterface(ABC):
    @abstractmethod
    def add_chunks(self, chunks: list[dict]) -> None:
        """Store embedded chunks with metadata."""
        pass

    @abstractmethod
    def query(self, query_vector: list[float], top_k: int) -> list[RetrievedChunk]:
        """Retrieve top-K chunks by similarity. Returns chunks with metadata."""
        pass

    @abstractmethod
    def delete_document(self, document_id: str) -> None:
        """Remove all chunks for a given document_id (for re-indexing)."""
        pass

    @abstractmethod
    def get_status(self) -> dict:
        """Return index status: document_count, chunk_count, last_indexed."""
        pass
