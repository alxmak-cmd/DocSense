from abc import ABC, abstractmethod


class EmbedderInterface(ABC):
    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of text strings. Returns list of dense vectors."""
        pass

    @abstractmethod
    def embed_query(self, query: str) -> list[float]:
        """Embed a single query string. Returns a dense vector."""
        pass
