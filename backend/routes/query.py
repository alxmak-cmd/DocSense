import os

from fastapi import APIRouter, Request
from pydantic import BaseModel

from models.schemas import Citation, QueryResponse, RetrievedChunk

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    session_id: str


# ---------------------------------------------------------------------------
# POST /query
# ---------------------------------------------------------------------------

@router.post("/query", response_model=QueryResponse)
def query(body: QueryRequest, request: Request) -> QueryResponse:
    """
    Answer a question grounded in the indexed documentation.

    Steps:
      1. Embed query
      2. Retrieve top-K chunks
      3. Filter below MIN_SIMILARITY_SCORE
      4. Coverage check → NOT_FOUND if insufficient
      5. Compute confidence from avg similarity
      6. Call Claude with grounding prompt
      7. Intercept NOT_FOUND sentinel
      8. Return structured response
    """
    top_k = int(os.getenv("TOP_K", 5))
    min_similarity = float(os.getenv("MIN_SIMILARITY_SCORE", 0.35))
    min_chunks = int(os.getenv("MIN_CHUNKS_FOR_ANSWER", 2))
    min_coverage = float(os.getenv("MIN_COVERAGE_SCORE", 0.40))
    high_threshold = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", 0.70))
    med_threshold = float(os.getenv("MED_CONFIDENCE_THRESHOLD", 0.50))

    embedder = request.app.state.embedder
    retriever = request.app.state.retriever
    generator = request.app.state.generator

    # Step 1 — embed query
    query_vector = embedder.embed_query(body.query)

    # Step 2 — retrieve top-K
    raw_chunks = retriever.query(query_vector, top_k)

    # Step 3 — filter below similarity threshold
    filtered_chunks = [c for c in raw_chunks if c.similarity_score >= min_similarity]

    # Step 4 — coverage check
    avg_similarity = (
        sum(c.similarity_score for c in filtered_chunks) / len(filtered_chunks)
        if filtered_chunks
        else 0.0
    )

    if len(filtered_chunks) < min_chunks or avg_similarity < min_coverage:
        return _not_found_response(body.session_id)

    # Step 5 — confidence scoring
    confidence = _score_confidence(avg_similarity, high_threshold, med_threshold)

    # Step 6 + 7 — call Claude, intercept NOT_FOUND sentinel
    answer = generator.generate(body.query, filtered_chunks)

    if answer is None:
        return _not_found_response(body.session_id)

    # Step 8 — build citations and detect conflict
    citations = [_to_citation(c) for c in filtered_chunks]
    conflict = _detect_conflict(answer)

    return QueryResponse(
        response_type="answered",
        answer=answer,
        citations=citations,
        confidence=confidence,
        conflict=conflict,
        session_id=body.session_id,
    )


# ---------------------------------------------------------------------------
# GET /index/status
# ---------------------------------------------------------------------------

@router.get("/index/status")
def index_status(request: Request) -> dict:
    """Return document count, chunk count, and last indexed timestamp."""
    return request.app.state.retriever.get_status()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _not_found_response(session_id: str) -> QueryResponse:
    return QueryResponse(
        response_type="not_found",
        answer=None,
        citations=[],
        confidence="none",
        conflict=False,
        session_id=session_id,
    )


_CONFLICT_SIGNALS = frozenset([
    "conflicting", "conflict", "contradicts", "contradiction",
    "discrepancy", "inconsistent", "inconsistency", "disagrees",
    "differs", "differ",
])


def _detect_conflict(answer: str) -> bool:
    lower = answer.lower()
    return any(signal in lower for signal in _CONFLICT_SIGNALS)


def _score_confidence(
    avg_similarity: float,
    high_threshold: float,
    med_threshold: float,
) -> str:
    if avg_similarity >= high_threshold:
        return "high"
    if avg_similarity >= med_threshold:
        return "medium"
    return "low"


def _clean_preview(content: str, length: int = 150) -> str:
    """
    Return up to `length` chars starting from the first clean boundary.

    Chunks created with overlap may start mid-word or mid-sentence.
    Scans forward for the nearest heading, paragraph, or sentence start
    so the preview always begins at a readable point.
    """
    text = content.lstrip()
    if not text:
        return ""
    # Already starts cleanly: Markdown heading or capitalised sentence
    if text[0] == "#" or text[0].isupper():
        return text[:length]
    # Mid-content start: find first clean boundary within first 300 chars
    for sep in ("\n\n", "\n", ". ", "! ", "? "):
        pos = text.find(sep, 0, 300)
        if pos != -1:
            candidate = text[pos + len(sep):].lstrip()
            if candidate:
                return candidate[:length]
    return text[:length]


def _to_citation(chunk: RetrievedChunk) -> Citation:
    return Citation(
        chunk_id=chunk.chunk_id,
        document_name=chunk.document_name,
        section_header=chunk.section_header,
        last_modified=chunk.last_modified,
        chunk_preview=_clean_preview(chunk.content),
        chunk_content=chunk.content,
        similarity_score=chunk.similarity_score,
    )
