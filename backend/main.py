# Patch platform.uname before voyageai is imported.
# The voyageai client calls platform.uname() to build its User-Agent header.
# On Windows + Anaconda, the WMI CPU query inside platform.py times out,
# raising OSError 258 and crashing the request. Returning a safe static value
# avoids the WMI call entirely; the User-Agent is cosmetic, not functional.
import platform as _platform
import collections

_SafeUname = collections.namedtuple(
    "uname_result", ["system", "node", "release", "version", "machine", "processor"]
)
_platform.uname = lambda: _SafeUname("Windows", "", "11", "", "AMD64", "")

from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Resolve .env relative to this file so it loads correctly regardless
# of which directory uvicorn is launched from.
load_dotenv(Path(__file__).parent / ".env")

from routes.ingest import router as ingest_router  # noqa: E402
from routes.query import router as query_router    # noqa: E402
from services.embedder import LocalEmbedder        # noqa: E402
from services.generator import Generator           # noqa: E402
from services.retriever import QdrantRetriever     # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Instantiate services once at startup; store on app.state for DI."""
    app.state.embedder = LocalEmbedder()
    app.state.retriever = QdrantRetriever()
    app.state.generator = Generator()
    yield
    # No explicit teardown needed: Chroma flushes on process exit.


app = FastAPI(
    title="DocSense",
    description="AI-powered documentation agent with grounded Q&A and source citations.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(query_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
