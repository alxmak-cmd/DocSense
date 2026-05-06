import hashlib
import uuid
from datetime import datetime, timezone
from io import BytesIO

from pypdf import PdfReader

CHUNK_SIZE = 2048       # ~512 tokens at ~4 chars/token
CHUNK_OVERLAP = 205     # ~10% overlap
SEPARATORS = ["\n\n", "\n", " ", ""]


def chunk_file(
    file_bytes: bytes,
    filename: str,
    last_modified: str,
) -> list[dict]:
    """
    Parse, split, and annotate a file into chunks ready for embedding.

    Returns a list of chunk dicts matching the Chroma metadata schema.
    Each dict includes 'content' plus all metadata fields.
    """
    text = _extract_text(file_bytes, filename)
    raw_chunks = _split_text(text)
    document_id = str(uuid.uuid4())
    indexed_at = datetime.now(timezone.utc).isoformat()

    chunks = []
    for i, chunk_text in enumerate(raw_chunks):
        chunks.append({
            "content": chunk_text,
            "document_name": filename,
            "document_id": document_id,
            "section_header": _extract_section_header(text, chunk_text, filename),
            "last_modified": last_modified,
            "indexed_at": indexed_at,
            "content_hash": hashlib.md5(chunk_text.encode()).hexdigest(),
            "source_type": "file_upload",
            "chunk_index": i,
        })

    return chunks


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def _extract_text(file_bytes: bytes, filename: str) -> str:
    """Return raw text from a Markdown, .txt, or PDF file."""
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages)
    return file_bytes.decode("utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Chunking — pure Python, no langchain dependency
# ---------------------------------------------------------------------------

def _split_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks using recursive separator logic.

    Mirrors LangChain RecursiveCharacterTextSplitter behaviour:
    prefers semantic boundaries (paragraphs > lines > words > chars).
    """
    atoms = _recursive_split(text, SEPARATORS)
    return _merge_with_overlap(atoms)


def _recursive_split(text: str, separators: list[str]) -> list[str]:
    """
    Recursively split text on the first separator that produces pieces
    small enough to be useful. Falls back to the next separator when a
    piece still exceeds CHUNK_SIZE.
    """
    if not text:
        return []

    # Find the first separator present in this text
    sep = ""
    remaining = list(separators)
    for candidate in separators:
        if candidate == "" or candidate in text:
            sep = candidate
            remaining = separators[separators.index(candidate) + 1:]
            break

    parts = text.split(sep) if sep else [text[i:i + CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]

    atoms: list[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if len(part) <= CHUNK_SIZE:
            atoms.append(part)
        elif remaining:
            atoms.extend(_recursive_split(part, remaining))
        else:
            # No more separators — hard split by size
            for i in range(0, len(part), CHUNK_SIZE):
                atoms.append(part[i:i + CHUNK_SIZE])

    return atoms


def _merge_with_overlap(atoms: list[str]) -> list[str]:
    """
    Greedily merge atomic pieces into chunks up to CHUNK_SIZE,
    then start the next chunk with CHUNK_OVERLAP chars of lookback.
    """
    if not atoms:
        return []

    chunks: list[str] = []
    current = atoms[0]

    for atom in atoms[1:]:
        joined = current + "\n\n" + atom
        if len(joined) <= CHUNK_SIZE:
            current = joined
        else:
            chunks.append(current)
            # Seed next chunk with trailing overlap from the closed chunk
            overlap = current[-CHUNK_OVERLAP:] if len(current) > CHUNK_OVERLAP else current
            current = overlap + "\n\n" + atom if overlap else atom

    if current:
        chunks.append(current)

    return chunks


# ---------------------------------------------------------------------------
# Section header extraction
# ---------------------------------------------------------------------------

def _extract_section_header(full_text: str, chunk_text: str, fallback: str) -> str:
    """
    Find the nearest Markdown heading (# or ##) preceding the chunk.

    Scans backward through lines before the chunk start position.
    Falls back to the document name if no heading is found.
    """
    chunk_start = full_text.find(chunk_text)
    if chunk_start == -1:
        return fallback

    preceding = full_text[:chunk_start]
    for line in reversed(preceding.splitlines()):
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()

    return fallback
