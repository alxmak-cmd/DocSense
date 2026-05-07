from pydantic import BaseModel
from typing import Literal


class Citation(BaseModel):
    chunk_id: str
    document_name: str
    section_header: str
    last_modified: str
    chunk_preview: str      # excerpt starting from a clean sentence/line boundary
    chunk_content: str      # full chunk text, returned for the expand view
    similarity_score: float  # retrieval similarity for this chunk


class QueryResponse(BaseModel):
    response_type: Literal["answered", "not_found"]
    answer: str | None
    citations: list[Citation]
    confidence: Literal["high", "medium", "low", "none"]
    conflict: bool = False
    session_id: str


class IngestResponse(BaseModel):
    status: Literal["success", "error"]
    document_name: str
    chunks_indexed: int


class RetrievedChunk(BaseModel):
    chunk_id: str
    document_name: str
    section_header: str
    last_modified: str
    content: str
    similarity_score: float
