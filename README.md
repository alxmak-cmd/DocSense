# DocSense

**DocSense doesn't synthesize. It exposes.**

---

## What It Is

DocSense is a RAG-based documentation agent that answers questions about your internal docs and tells you exactly where the answer came from — or tells you it doesn't know. It surfaces conflicts between documents rather than silently resolving them. It attaches a confidence score to every answer based on retrieval similarity, not model confidence.

Built as a Phase 1 portfolio project demonstrating AI product thinking, backend architecture, and evaluation discipline.

---

## Why It Exists

Most AI documentation tools optimize for helpfulness over honesty. They synthesize across sources, resolve contradictions quietly, and return confident-sounding answers even when the underlying retrieval is weak. That works for demos. It fails in production, where a hallucinated API timeout or a wrong retry count causes real incidents.

DocSense bets on trust over coverage. An explicit "not found" is more useful than a plausible-sounding wrong answer. A conflict surfaced is more useful than a conflict hidden.

---

## Architecture

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, two-panel layout |
| Backend | Python 3.11 + FastAPI, sync routes |
| Embeddings | Voyage AI `voyage-3` (API-based, 1024-dim) |
| Vector store | Qdrant in-memory (pre-built wheels, no compilation) |
| LLM | Claude 3.5 Sonnet via Anthropic API |
| Chunking | Custom recursive splitter (pure Python stdlib) |

---

## Key Design Decisions

- **Voyage AI over sentence-transformers.** Local models required C++ Build Tools to compile `chroma-hnswlib` on Windows and caused torch/transformers version conflicts in Anaconda environments. Voyage AI's `voyage-3` ships pre-built, adds no compilation step, and uses asymmetric `input_type` hints (`document` vs `query`) that improve retrieval precision. Upgrade trigger: if answer accuracy falls below 80%, switch to `voyage-3-large` via env var — no code changes.

- **Qdrant over Chroma.** ChromaDB 0.4.x required C++ Build Tools on Windows; 1.0.x replaced the HNSW backend with a Rust/C extension (`sqlite-vec`) that crashes at runtime on Windows. Qdrant ships pre-built wheels on all platforms with no native dependencies. The `RetrieverInterface` abstraction means the swap was one file and one import — no application logic changed. Phase 2 persistent storage is a one-line change: `QdrantClient(path="./qdrant_db")`.

- **Conflict detection as a core differentiator.** The eval corpus intentionally contains contradictory values across `sample_api_spec.md` and `sample_runbook.md` (webhook timeout: 30s vs 60s; retry count: 3 vs 5). DocSense retrieves from both, cites both, and lets Claude surface the disagreement with source attribution. It does not resolve the conflict or pick a winner. This is a deliberate product decision: the user needs to know the docs disagree, not receive a synthesized answer that hides the inconsistency.

---

## Eval Results

Evaluated against a 10-query structured test set covering answerable, not-answerable, ambiguous, conflicting, and edge cases.

| Metric | Result |
|---|---|
| Response type accuracy | 70% |
| Source match rate | 80% |
| Avg latency | 2,152 ms |
| P95 latency | 3,847 ms |
| Pending manual grades | 10 |

Manual grading fields (correctness, citation validity, hallucination detection) are initialized to `null` in the results JSON — ready for human review. Full results at `backend/eval/eval_results/`.

> Note: accuracy reflects Phase 1 threshold tuning on a small corpus. Retrieval thresholds (`MIN_SIMILARITY_SCORE`, `MIN_COVERAGE_SCORE`) are explicit env var constants, not magic numbers, and are documented with rationale in the build brief.

---

## How to Run

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows bash
pip install -r requirements.txt

cp .env.example .env
# Set ANTHROPIC_API_KEY and VOYAGE_API_KEY in .env

uvicorn main:app --reload --workers 1 --loop asyncio --timeout-keep-alive 0
# Running at http://127.0.0.1:8000
```

Ingest test documents:

```bash
python test_ingest.py
```

Run the eval harness:

```bash
python eval/eval_runner.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

---

## Portfolio Artifacts

| Document | Description |
|---|---|
| [`docs/PRFAQ_RAG_DocAgent_v3.md`](docs/PRFAQ_RAG_DocAgent_v3.md) | Product vision, customer problem, FAQ |
| [`docs/PRD_RAG_DocAgent_v2.md`](docs/PRD_RAG_DocAgent_v2.md) | Requirements, success metrics, phasing |
| [`docs/ARCHITECTURE_RAG_DocAgent_v2.md`](docs/ARCHITECTURE_RAG_DocAgent_v2.md) | System design, data flow, tradeoff rationale |

---

## Phase 2 Roadmap

- **Persistent vector store.** Switch `QdrantClient(":memory:")` to `QdrantClient(path="./qdrant_db")` for local persistence, or connect to a hosted Qdrant cluster for production. The `RetrieverInterface` abstraction requires no other changes.

- **Source crawlers.** Extend beyond file upload to ingest from Confluence spaces, GitHub repos, and Notion databases. Each crawler implements the same ingest pipeline — chunk, embed, store — with a `source_type` metadata field that makes the origin queryable.

- **Conflict detection UI.** When retrieved chunks disagree on a value, surface a visual conflict indicator in the `CitationList` alongside the similarity bars. Flag the specific fields in conflict and show both source values side by side, rather than leaving the user to notice the discrepancy in the answer text.
