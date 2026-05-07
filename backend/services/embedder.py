import logging
import os

import voyageai

from interfaces.embedder_interface import EmbedderInterface

logger = logging.getLogger(__name__)


class LocalEmbedder(EmbedderInterface):
    """
    Voyage AI embedder — API-based, no local model or torch dependency.

    Uses separate input_type hints for document vs query embedding;
    Voyage models are trained to distinguish these and return better
    representations when the type is specified.

    Default model: voyage-3 (set via EMBEDDING_MODEL env var).
    Upgrade path: swap to voyage-3-large via env var — no code changes.
    """

    def __init__(self) -> None:
        self._client = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))
        self._model = os.getenv("EMBEDDING_MODEL", "voyage-3")

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of document chunks. Used during ingestion."""
        try:
            result = self._client.embed(texts, model=self._model, input_type="document")
            return result.embeddings
        except Exception as e:
            logger.error("Voyage AI embed (document) failed: %s", e, exc_info=True)
            raise

    def embed_query(self, query: str) -> list[float]:
        """Embed a single query string. Used at query time."""
        try:
            result = self._client.embed([query], model=self._model, input_type="query")
            return result.embeddings[0]
        except Exception as e:
            logger.error("Voyage AI embed (query) failed: %s", e, exc_info=True)
            raise
