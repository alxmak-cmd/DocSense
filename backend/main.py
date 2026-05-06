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
