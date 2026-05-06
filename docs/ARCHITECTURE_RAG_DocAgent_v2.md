# Architecture: DocSense — RAG Documentation Agent
**Classification:** Portfolio Artifact | Principal PM IC Candidate  
**Version:** 2.0  
**Target Roles:** Twilio Principal PM (Copilot Backend), IDC Principal PM-T (AI Discovery Platform)

---

## Problem Grounding

Engineering teams don't have a search problem. They have a trust problem. Existing tools return fluent answers that are wrong often enough to erode confidence. The architecture of DocSense is designed around one constraint: **every answer must be traceable to a specific source, or must explicitly say it cannot answer.**

This constraint drives three architectural decisions that differ from standard RAG implementations: a strict grounding prompt that prohibits synthesis, a NOT_FOUND state as a first-class response type, and a conflict detection layer that compares retrieved chunks before generation.

---

## System Overview

```
User Query
    │
    ▼
[Query Embedding]          ← Voyage AI (voyage-3, input_type="query")
    │
    ▼
[Vector Retrieval]         ← Qdrant (in-memory, Phase 1)
    │
    ▼
[Coverage Scoring]         ← similarity threshold + chunk count check
    │
    ├── below threshold → NOT_FOUND response
    │
    ▼
[Conflict Detection]       ← LLM comparison across retrieved chunks
    │
    ├── conflict detected → surface both values + conflict flag
    │
    ▼
[Answer Generation]        ← Claude API (strict grounding prompt)
    │
    ▼
[Confidence Scoring]       ← similarity scores → High / Medium / Low badge
    │
    ▼
[Response + Citations]     → Frontend (CitationList + ConfidenceBadge)
```

---

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React / Vite | Component model fits citation list + confidence badge UI |
| Backend | Python / FastAPI | RAG ecosystem alignment (LangChain, sentence-transformers, Chroma all Python-native) |
| Embeddings | Voyage AI (voyage-3) | Asymmetric training (document vs. query vectors) improves retrieval precision; Anthropic-aligned stack |
| Vector Store | Qdrant (in-memory) | Pre-built Windows wheels; no C++ compilation required; one-line swap to persistent in P2 |
| LLM | Claude API (claude-sonnet-4-5) | Strict instruction-following for grounding constraint; citation format control |
| Deployment | Local (Phase 1) | Vercel (frontend) + Railway (backend) planned for Phase 2 |

---

## Key Architectural Decisions (ADRs)

### ADR-1: Voyage AI over sentence-transformers

**Decision:** Use Voyage AI API for embeddings instead of local sentence-transformers model.

**Context:** Original design used `all-MiniLM-L6-v2` via sentence-transformers. Windows/Anaconda environment had a torch/transformers version conflict that caused worker crashes on startup.

**Alternatives considered:**
- Fix torch version conflict — high risk, Anaconda base environment interference
- OpenAI text-embedding-3-small — viable, but adds OpenAI dependency to an Anthropic-stack portfolio
- Voyage AI — Anthropic's recommended embedding partner, asymmetric document/query training, free tier sufficient for Phase 1

**Decision rationale:** Voyage AI removes the local ML dependency entirely, aligns with the Anthropic stack, and provides a genuine technical advantage (asymmetric embeddings) over the local model alternative.

**Tradeoff:** Adds API dependency and rate limit constraint (3 RPM free tier). Eval runner requires 25s delay between queries. Paid tier resolves at $0.06/1M tokens.

---

### ADR-2: Qdrant over Chroma

**Decision:** Use Qdrant (in-memory) as vector store instead of ChromaDB.

**Context:** ChromaDB was the original vector store. ChromaDB 1.0.0 (installed by default) uses a new Rust/C sqlite-vec backend that crashes on Windows with a native extension error. ChromaDB 0.4.x requires `chroma-hnswlib` which needs Microsoft C++ Build Tools to compile — not available in the target environment.

**Alternatives considered:**
- Install C++ Build Tools — environment dependency, fragile for portfolio reproducibility
- ChromaDB 0.5.x — same hnswlib compilation requirement
- Qdrant in-memory — pre-built wheels, no compilation, identical API surface for Phase 1 use case
- FAISS — Facebook's library, similar compilation issues on Windows

**Decision rationale:** Qdrant in-memory mode has zero external dependencies, installs cleanly on Windows, and the `RetrieverInterface` abstraction means zero code changes when switching to persistent Qdrant in Phase 2.

**Tradeoff:** In-memory means vector store resets on server restart. Requires re-ingestion after each restart. Documented as a known Phase 1 limitation; one-line fix (`QdrantClient(path="./qdrant_db")`) for Phase 2.

---

### ADR-3: Strict grounding prompt over summarization

**Decision:** LLM is instructed to answer only from provided context chunks, never from training data, and to return a structured NOT_FOUND signal when coverage is insufficient.

**Context:** Standard RAG implementations allow the LLM to "fill in" from training data when retrieval is incomplete. This produces higher answer coverage but lower answer trustworthiness.

**Decision rationale:** The core product bet is trust over coverage. A system that always returns an answer is a system that engineers stop trusting. The NOT_FOUND state is only valuable if it's reliable — which requires the grounding constraint to be enforced at the prompt level, not just hoped for.

**Tradeoff:** Lower answer coverage metrics in eval. Acceptable given the product positioning.

---

### ADR-4: Abstraction layer for embedder and retriever

**Decision:** `EmbedderInterface` and `RetrieverInterface` abstract base classes define the contract; concrete implementations are swappable via single import change in `main.py`.

**Rationale:** The environment issues encountered during Phase 1 build (torch conflicts, ChromaDB compilation failures) demonstrated that the embedding and storage layer is the most likely source of future changes. The abstraction layer ensures those changes are localized.

---

## Trust Layer Design

```
Retrieved Chunks
      │
      ├── similarity scores → aggregate → Confidence Level
      │         HIGH (≥0.70) / MEDIUM (≥0.50) / LOW (<0.50) / NONE
      │
      ├── chunk count + coverage score → NOT_FOUND gate
      │         if chunks < MIN_CHUNKS_FOR_ANSWER → NOT_FOUND
      │         if coverage < MIN_COVERAGE_SCORE → NOT_FOUND
      │
      └── cross-chunk comparison → Conflict Detection
                if same semantic field → different values → CONFLICT flag
```

The trust layer runs between retrieval and generation. If the NOT_FOUND gate triggers, the LLM is never called — this is a cost and latency optimization as well as a trust signal.

---

## Latency Budget

| Component | Target | P95 (Phase 1 actual) |
|---|---|---|
| Query embedding (Voyage AI) | 200ms | ~400ms |
| Vector retrieval (Qdrant) | 50ms | <50ms |
| Coverage scoring | 5ms | <5ms |
| LLM generation (Claude) | 1500ms | ~2000ms |
| Response serialization | 10ms | <10ms |
| **Total** | **≤2000ms** | **~2500ms** |

P95 latency in Phase 1 eval: 7296ms (driven by Voyage AI free tier rate limiting adding retry delay). Paid tier eliminates this; true P95 is ~3000ms.

---

## Data Model

### Chunk Schema
```python
{
  "chunk_id": str,          # {document_id}_{chunk_index}
  "document_name": str,     # original filename
  "section_header": str,    # nearest preceding ## heading
  "content": str,           # chunk text
  "last_modified": str,     # ISO 8601 timestamp
  "indexed_at": str,        # ISO 8601 timestamp
  "similarity_score": float # populated at query time
}
```

### Query Response Schema
```python
{
  "response_type": "answered" | "not_found",
  "answer": str | None,
  "citations": [Citation],
  "confidence": "high" | "medium" | "low" | "none",
  "session_id": str
}
```

---

## Failure Modes

| Failure | Detection | Behavior |
|---|---|---|
| Voyage API key missing | Startup check | Server fails to start with clear error |
| Voyage API rate limit | HTTP 429 from Voyage | Retry with backoff; return 503 after max retries |
| Qdrant collection empty | chunk count = 0 | NOT_FOUND with "no documents indexed" message |
| Retrieval below threshold | similarity < MIN_SIMILARITY_SCORE | NOT_FOUND |
| LLM returns non-JSON | JSON parse error | 500 with traceback; logged for debugging |
| Corpus conflict | Cross-chunk field mismatch | CONFLICT flag + both values returned |
| Worker crash (Windows) | Connection reset | Documented; venv isolation resolves Anaconda conflicts |

---

## Chunking Strategy

**Method:** Recursive character splitting (pure Python stdlib, no LangChain dependency).

**Parameters:**
- `CHUNK_SIZE = 2048` characters (~512 tokens at 4 chars/token)
- `CHUNK_OVERLAP = 200` characters

**Separator cascade:** `\n\n` → `\n` → ` ` → character split

**Section header extraction:** Each chunk captures the nearest preceding `##` heading for citation display. Falls back to document name if no heading found.

**Rationale for chunk size:** 2048 characters balances retrieval precision (smaller chunks) against context completeness (larger chunks). Tunable via env var in Phase 2.

---

## Phase 2 Architecture Changes

| Change | Effort | Impact |
|---|---|---|
| Qdrant persistent (`path=` arg) | 1 line | Docs survive server restart |
| GitHub connector | 2 days | Automatic ingestion from repos |
| Confluence connector | 3 days | Enterprise org support |
| Conflict detection UI | 1 day | Visual conflict indicator in CitationList |
| Hybrid retrieval (BM25 + semantic) | 3 days | Improved recall on exact-match queries |
| Vercel + Railway deployment | 1 day | Live URL, no local setup required |

---

## Artifact Metadata

| Field | Value |
|---|---|
| Target Roles | Twilio Principal PM (Copilot Backend), IDC Principal PM-T (AI Discovery Platform) |
| Portfolio Signal | System design judgment, ADR documentation, failure mode thinking, tradeoff rationale |
| Build Method | BMAD Method v6.3 + Claude Code |
| Stack | React / Vite / FastAPI / Voyage AI / Qdrant / Claude API |
| Version | 2.0 — updated with Phase 1 build decisions |
