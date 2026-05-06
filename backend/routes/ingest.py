import base64
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from models.schemas import IngestResponse
from services.chunker import chunk_file

router = APIRouter()

SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf"}


class IngestPayload(BaseModel):
    filename: str
    content_base64: str   # base64-encoded file bytes


@router.post("/ingest/test")
def ingest_test() -> dict:
    """Smoke test — confirms the route is reachable."""
    return {"status": "ok"}


@router.post("/ingest", response_model=IngestResponse)
def ingest(payload: IngestPayload, request: Request) -> IngestResponse:
    """
    Ingest a document into the vector index.

    Accepts JSON body with base64-encoded file content.
    FastAPI deserialises the JSON before this route runs — no async
    body streaming, no multipart parser, no Windows async I/O issues.

    Accepted extensions: .md, .txt, .pdf

    curl example:
      # bash / git bash:
      CONTENT=$(base64 -w 0 doc.md)
      curl -X POST http://localhost:8000/ingest \\
           -H "Content-Type: application/json" \\
           -d "{\"filename\":\"doc.md\",\"content_base64\":\"$CONTENT\"}"

      # PowerShell:
      $content = [Convert]::ToBase64String([IO.File]::ReadAllBytes("doc.md"))
      Invoke-RestMethod http://localhost:8000/ingest -Method Post \\
        -ContentType "application/json" \\
        -Body (ConvertTo-Json @{filename="doc.md"; content_base64=$content})
    """
    print("DEBUG 1: route entered", flush=True)
    try:
        print("DEBUG 2: payload received", payload.filename, flush=True)

        _validate_extension(payload.filename)
        print("DEBUG 3: extension valid", flush=True)

        try:
            file_bytes = base64.b64decode(payload.content_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="content_base64 is not valid base64.")
        print("DEBUG 4: decoded bytes", len(file_bytes), flush=True)

        if not file_bytes:
            raise HTTPException(status_code=400, detail="Decoded file content is empty.")

        last_modified = datetime.now(timezone.utc).isoformat()
        print("DEBUG 5: starting chunker", flush=True)

        chunks = chunk_file(file_bytes, payload.filename, last_modified)
        print("DEBUG 6: chunks produced", len(chunks), flush=True)

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail="No content could be extracted from the uploaded file.",
            )

        print("DEBUG 7: getting embedder", flush=True)
        embedder = request.app.state.embedder
        retriever = request.app.state.retriever

        contents = [c["content"] for c in chunks]
        print("DEBUG 8: starting embed, chunk count", len(contents), flush=True)

        vectors = embedder.embed(contents)
        print("DEBUG 9: embed complete, vector count", len(vectors), flush=True)

        for chunk, vector in zip(chunks, vectors):
            chunk["embedding"] = vector

        print("DEBUG 10: starting retriever.add_chunks", flush=True)
        retriever.add_chunks(chunks)
        print("DEBUG 11: add_chunks complete", flush=True)

        return IngestResponse(
            status="success",
            document_name=payload.filename,
            chunks_indexed=len(chunks),
        )

    except HTTPException:
        raise
    except Exception:
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=500,
            content={"error": "Ingest failed", "traceback": tb},
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _validate_extension(filename: str) -> None:
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )
